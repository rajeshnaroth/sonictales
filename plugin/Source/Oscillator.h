#pragma once

#include <JuceHeader.h>

class Oscillator
{
public:
    enum class Waveform
    {
        Sine,
        Saw,
        Square
    };

    Oscillator();

    void setWaveform(Waveform waveform);
    void setFrequency(float frequency);
    void setSampleRate(float sampleRate);
    void reset();

    float getNextSample();

private:
    Waveform currentWaveform = Waveform::Saw;
    float frequency = 440.0f;
    float sampleRate = 44100.0f;
    float phase = 0.0f;
    float phaseIncrement = 0.0f;

    void updatePhaseIncrement();
};
