#include "SynthVoice.h"

SynthVoice::SynthVoice()
{
    // Initialize ADSR with default values
    adsrParams.attack = 0.1f;
    adsrParams.decay = 0.1f;
    adsrParams.sustain = 1.0f;
    adsrParams.release = 0.1f;
    adsr.setParameters(adsrParams);
}

bool SynthVoice::canPlaySound(juce::SynthesiserSound* sound)
{
    return dynamic_cast<SynthSound*>(sound) != nullptr;
}

void SynthVoice::startNote(int midiNoteNumber, float velocity,
                          juce::SynthesiserSound*, int)
{
    // Convert MIDI note to frequency
    float frequency = juce::MidiMessage::getMidiNoteInHertz(midiNoteNumber);
    oscillator.setFrequency(frequency);
    oscillator.reset();

    adsr.noteOn();
}

void SynthVoice::stopNote(float velocity, bool allowTailOff)
{
    adsr.noteOff();

    if (!allowTailOff || !adsr.isActive())
        clearCurrentNote();
}

void SynthVoice::renderNextBlock(juce::AudioBuffer<float>& outputBuffer,
                                int startSample, int numSamples)
{
    if (!isPrepared || !isVoiceActive())
        return;

    juce::dsp::AudioBlock<float> audioBlock(outputBuffer);
    audioBlock = audioBlock.getSubBlock(startSample, numSamples);
    juce::dsp::ProcessContextReplacing<float> context(audioBlock);

    for (int sample = 0; sample < numSamples; ++sample)
    {
        // Generate oscillator sample
        float oscSample = oscillator.getNextSample();

        // Apply ADSR envelope
        float adsrValue = adsr.getNextSample();
        float currentSample = oscSample * adsrValue;

        // Write to all output channels
        for (int channel = 0; channel < outputBuffer.getNumChannels(); ++channel)
        {
            outputBuffer.addSample(channel, startSample + sample, currentSample);
        }

        // Check if note should be stopped
        if (!adsr.isActive())
        {
            clearCurrentNote();
            break;
        }
    }

    // Apply filter to the block
    filter.process(context);
}

void SynthVoice::prepareToPlay(double sampleRate, int samplesPerBlock, int outputChannels)
{
    oscillator.setSampleRate(static_cast<float>(sampleRate));

    adsr.setSampleRate(sampleRate);

    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = static_cast<juce::uint32>(samplesPerBlock);
    spec.numChannels = static_cast<juce::uint32>(outputChannels);

    filter.prepare(spec);
    filter.reset();
    filter.setType(juce::dsp::StateVariableTPTFilterType::lowpass);

    isPrepared = true;
}

void SynthVoice::updateADSR(float attack, float decay, float sustain, float release)
{
    adsrParams.attack = attack;
    adsrParams.decay = decay;
    adsrParams.sustain = sustain;
    adsrParams.release = release;
    adsr.setParameters(adsrParams);
}

void SynthVoice::updateFilter(float cutoff, float resonance)
{
    filter.setCutoffFrequency(cutoff);
    filter.setResonance(resonance);
}

void SynthVoice::updateOscillator(int waveformIndex)
{
    switch (waveformIndex)
    {
        case 0:
            oscillator.setWaveform(Oscillator::Waveform::Sine);
            break;
        case 1:
            oscillator.setWaveform(Oscillator::Waveform::Saw);
            break;
        case 2:
            oscillator.setWaveform(Oscillator::Waveform::Square);
            break;
        default:
            oscillator.setWaveform(Oscillator::Waveform::Saw);
            break;
    }
}
