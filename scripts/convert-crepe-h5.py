#!/usr/bin/env python3
"""
Convert CREPE Keras .h5 weights to TensorFlow.js LayersModel format.

Only needs h5py + numpy (no tensorflow).

Usage:
  python3 scripts/convert-crepe-h5.py /tmp/crepe-model-small.h5 models/crepe-small/
"""

import sys
import os
import json
import numpy as np
import h5py


def navigate(grp, wname):
    """Navigate HDF5 group to reach a dataset."""
    ds = grp
    for p in wname.split('/'):
        ds = ds[p]
    return ds


def build_topology(filter_counts):
    """Build CREPE model topology matching the original CREPE architecture.

    Key details from marl/crepe source:
    - Conv2D, NOT Conv1D
    - conv1 has stride (4,1), all others stride (1,1)
    - Permute(2,1,3) before Flatten (swaps spatial dims)
    - Input reshaped to (1024, 1, 1)
    """
    widths = [512, 64, 64, 64, 64, 64]
    strides = [[4, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1]]
    layers = []

    layers.append({
        "class_name": "InputLayer",
        "config": {"batch_input_shape": [None, 1024], "dtype": "float32", "sparse": False, "name": "crepe_input"},
        "name": "crepe_input",
        "inbound_nodes": []
    })

    layers.append({
        "class_name": "Reshape",
        "config": {"name": "crepe_input_reshape", "target_shape": [1024, 1, 1]},
        "name": "crepe_input_reshape",
        "inbound_nodes": [[["crepe_input", 0, 0, {}]]]
    })

    prev = "crepe_input_reshape"

    for i in range(6):
        n = i + 1
        conv = f"crepe_conv{n}"
        bn = f"crepe_conv{n}_BN"
        pool = f"crepe_conv{n}_maxpool"
        drop = f"crepe_conv{n}_dropout"

        layers.append({
            "class_name": "Conv2D",
            "config": {
                "name": conv, "filters": filter_counts[i],
                "kernel_size": [widths[i], 1], "strides": strides[i],
                "padding": "same", "activation": "relu", "use_bias": True,
                "data_format": "channels_last"
            },
            "name": conv,
            "inbound_nodes": [[[prev, 0, 0, {}]]]
        })

        layers.append({
            "class_name": "BatchNormalization",
            "config": {"name": bn, "axis": -1},
            "name": bn,
            "inbound_nodes": [[[conv, 0, 0, {}]]]
        })

        layers.append({
            "class_name": "MaxPooling2D",
            "config": {"name": pool, "pool_size": [2, 1], "strides": [2, 1], "padding": "valid"},
            "name": pool,
            "inbound_nodes": [[[bn, 0, 0, {}]]]
        })

        layers.append({
            "class_name": "Dropout",
            "config": {"name": drop, "rate": 0.25},
            "name": drop,
            "inbound_nodes": [[[pool, 0, 0, {}]]]
        })

        prev = drop

    # Permute(2,1,3) — swaps spatial dims, same as original CREPE
    layers.append({
        "class_name": "Permute",
        "config": {"name": "crepe_transpose", "dims": [2, 1, 3]},
        "name": "crepe_transpose",
        "inbound_nodes": [[[prev, 0, 0, {}]]]
    })

    layers.append({
        "class_name": "Flatten",
        "config": {"name": "crepe_flatten"},
        "name": "crepe_flatten",
        "inbound_nodes": [[["crepe_transpose", 0, 0, {}]]]
    })

    layers.append({
        "class_name": "Dense",
        "config": {"name": "crepe_classifier", "units": 360, "activation": "sigmoid", "use_bias": True},
        "name": "crepe_classifier",
        "inbound_nodes": [[["crepe_flatten", 0, 0, {}]]]
    })

    return {
        "class_name": "Model",
        "config": {
            "name": "model_1",
            "layers": layers,
            "input_layers": [["crepe_input", 0, 0]],
            "output_layers": [["crepe_classifier", 0, 0]]
        }
    }


# Map from h5 weight names to tfjs weight names
H5_TO_TFJS = {
    'kernel:0': 'kernel',
    'bias:0': 'bias',
    'gamma:0': 'gamma',
    'beta:0': 'beta',
    'moving_mean:0': 'moving_mean',
    'moving_variance:0': 'moving_variance',
}

H5_LAYER_TO_TFJS = {
    'conv1': 'crepe_conv1', 'conv1-BN': 'crepe_conv1_BN',
    'conv2': 'crepe_conv2', 'conv2-BN': 'crepe_conv2_BN',
    'conv3': 'crepe_conv3', 'conv3-BN': 'crepe_conv3_BN',
    'conv4': 'crepe_conv4', 'conv4-BN': 'crepe_conv4_BN',
    'conv5': 'crepe_conv5', 'conv5-BN': 'crepe_conv5_BN',
    'conv6': 'crepe_conv6', 'conv6-BN': 'crepe_conv6_BN',
    'classifier': 'crepe_classifier',
}


def convert(h5_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    with h5py.File(h5_path, 'r') as f:
        keras_version = f.attrs.get('keras_version', b'2.1.5')
        if isinstance(keras_version, bytes):
            keras_version = keras_version.decode()

        layer_names = [n.decode() if isinstance(n, bytes) else n for n in f.attrs['layer_names']]

        # Detect filter counts from kernel shapes
        filter_counts = []
        for i in range(1, 7):
            grp = f[f'conv{i}']
            wnames = [n.decode() for n in grp.attrs['weight_names']]
            for wn in wnames:
                if 'kernel' in wn:
                    shape = navigate(grp, wn).shape
                    filter_counts.append(shape[-1])
                    break

        print(f"Filter counts: {filter_counts}")

        # Extract weights with remapped names
        specs = []
        all_data = bytearray()

        for layer_name in layer_names:
            if layer_name not in f:
                continue
            tfjs_layer = H5_LAYER_TO_TFJS.get(layer_name)
            if not tfjs_layer:
                continue

            grp = f[layer_name]
            weight_names = [n.decode() for n in grp.attrs.get('weight_names', [])]

            for wname in weight_names:
                ds = navigate(grp, wname)
                arr = np.array(ds, dtype=np.float32)

                # Build tfjs-compatible weight name
                w_suffix = wname.split('/')[-1]
                tfjs_wname = f"{tfjs_layer}/{H5_TO_TFJS.get(w_suffix, w_suffix)}"

                specs.append({
                    'name': tfjs_wname,
                    'shape': list(arr.shape),
                    'dtype': 'float32'
                })
                all_data.extend(arr.tobytes())

    shard = 'group1-shard1of1'
    with open(os.path.join(out_dir, shard), 'wb') as wf:
        wf.write(bytes(all_data))

    topology = build_topology(filter_counts)

    model_json = {
        'modelTopology': {
            'keras_version': keras_version,
            'backend': 'tensorflow',
            'model_config': topology
        },
        'weightsManifest': [{
            'paths': [shard],
            'weights': specs
        }]
    }

    with open(os.path.join(out_dir, 'model.json'), 'w') as mf:
        json.dump(model_json, mf)

    total_mb = len(all_data) / (1024 * 1024)
    print(f"Converted {len(specs)} weights ({total_mb:.1f} MB) → {out_dir}")
    for s in specs:
        print(f"  {s['name']}: {s['shape']}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input.h5> <output_dir>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
