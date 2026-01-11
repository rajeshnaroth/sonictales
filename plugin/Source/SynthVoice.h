#pragma once

#include <JuceHeader.h>
#include "SynthSound.h"
#include "Oscillator.h"

class SynthVoice : public juce::SynthesiserVoice
{
public:
    SynthVoice();

    bool canPlaySound(juce::SynthesiserSound* sound) override;

    void startNote(int midiNoteNumber, float velocity,
                   juce::SynthesiserSound*, int) override;

    void stopNote(float velocity, bool allowTailOff) override;

    void pitchWheelMoved(int) override {}
    void controllerMoved(int, int) override {}

    void renderNextBlock(juce::AudioBuffer<float>& outputBuffer,
                        int startSample, int numSamples) override;

    void prepareToPlay(double sampleRate, int samplesPerBlock, int outputChannels);

    // Parameter updates
    void updateADSR(float attack, float decay, float sustain, float release);
    void updateFilter(float cutoff, float resonance);
    void updateOscillator(int waveformIndex);

private:
    Oscillator oscillator;
    juce::ADSR adsr;
    juce::ADSR::Parameters adsrParams;

    juce::dsp::StateVariableTPTFilter<float> filter;
    juce::dsp::ProcessSpec spec;

    bool isPrepared = false;
};
