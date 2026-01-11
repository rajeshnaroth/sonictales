# SonicTalesSynth

A subtractive synthesizer plugin built with JUCE.

## Features

- Single oscillator with selectable waveforms (Sine, Saw, Square)
- ADSR amplitude envelope
- Low-pass filter with cutoff and resonance controls
- 8-voice polyphony
- AU and VST3 plugin formats for macOS

## Parameters

- **Waveform**: Select oscillator waveform (Sine, Saw, Square)
- **Filter Cutoff**: Low-pass filter cutoff frequency (20 Hz - 20 kHz)
- **Filter Resonance**: Filter resonance/Q factor
- **Attack**: Envelope attack time
- **Decay**: Envelope decay time
- **Sustain**: Envelope sustain level
- **Release**: Envelope release time
- **Master Volume**: Overall output level

## Building the Plugin

### Prerequisites

1. Install JUCE framework
   - Clone JUCE from https://github.com/juce-framework/JUCE
   - Place it at `../JUCE` relative to this plugin folder, or adjust the path in CMakeLists.txt

2. Install CMake (version 3.15 or higher)
   ```bash
   brew install cmake
   ```

3. Xcode Command Line Tools (should already be installed on macOS)

### Build Steps

1. Create a build directory:
   ```bash
   mkdir build
   cd build
   ```

2. Generate the build files:
   ```bash
   cmake ..
   ```

3. Build the plugin:
   ```bash
   cmake --build .
   ```

4. The compiled plugins will be automatically copied to:
   - AU: `~/Library/Audio/Plug-Ins/Components/SonicTalesSynth.component`
   - VST3: `~/Library/Audio/Plug-Ins/VST3/SonicTalesSynth.vst3`

## Project Structure

```
plugin/
├── CMakeLists.txt          # CMake build configuration
├── Source/
│   ├── PluginProcessor.h/cpp   # Main audio processor
│   ├── PluginEditor.h/cpp      # GUI editor
│   ├── SynthVoice.h/cpp        # Synthesizer voice
│   ├── SynthSound.h            # Synthesizer sound
│   └── Oscillator.h/cpp        # Waveform generator
└── README.md
```

## Usage

1. Load the plugin in your DAW (Logic Pro, Ableton Live, etc.)
2. Play MIDI notes to trigger the synthesizer
3. Adjust parameters to shape your sound:
   - Start with the waveform selection
   - Shape the sound with the filter
   - Control dynamics with the ADSR envelope
   - Adjust master volume to taste

## Development

- Built with JUCE 7.x
- C++17 standard
- Supports macOS (AU and VST3 formats)

## License

Created by SonicTales Productions
