#include "Oscillator.h"

Oscillator::Oscillator()
{
    updatePhaseIncrement();
}

void Oscillator::setWaveform(Waveform waveform)
{
    currentWaveform = waveform;
}

void Oscillator::setFrequency(float freq)
{
    frequency = freq;
    updatePhaseIncrement();
}

void Oscillator::setSampleRate(float sr)
{
    sampleRate = sr;
    updatePhaseIncrement();
}

void Oscillator::reset()
{
    phase = 0.0f;
}

float Oscillator::getNextSample()
{
    float sample = 0.0f;

    switch (currentWaveform)
    {
        case Waveform::Sine:
            sample = std::sin(phase * juce::MathConstants<float>::twoPi);
            break;

        case Waveform::Saw:
            sample = (2.0f * phase) - 1.0f;
            break;

        case Waveform::Square:
            sample = phase < 0.5f ? 1.0f : -1.0f;
            break;
    }

    phase += phaseIncrement;
    if (phase >= 1.0f)
        phase -= 1.0f;

    return sample;
}

void Oscillator::updatePhaseIncrement()
{
    phaseIncrement = frequency / sampleRate;
}
