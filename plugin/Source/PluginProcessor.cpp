#include "PluginProcessor.h"
#include "PluginEditor.h"

SonicTalesSynthAudioProcessor::SonicTalesSynthAudioProcessor()
    : AudioProcessor(BusesProperties()
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "Parameters", createParameterLayout())
{
    // Add voices to the synthesiser (8-voice polyphony)
    for (int i = 0; i < 8; ++i)
        synth.addVoice(new SynthVoice());

    // Add a sound that all voices can play
    synth.addSound(new SynthSound());
}

SonicTalesSynthAudioProcessor::~SonicTalesSynthAudioProcessor()
{
}

juce::AudioProcessorValueTreeState::ParameterLayout SonicTalesSynthAudioProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    // Oscillator waveform selection (0: Sine, 1: Saw, 2: Square)
    layout.add(std::make_unique<juce::AudioParameterChoice>(
        "OSC_WAVE",
        "Oscillator Waveform",
        juce::StringArray{"Sine", "Saw", "Square"},
        1));

    // Oscillator mix (currently not used in single oscillator design, but included for future expansion)
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "OSC_MIX",
        "Oscillator Mix",
        0.0f, 1.0f, 1.0f));

    // Filter cutoff (20 Hz to 20 kHz)
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "FILTER_CUTOFF",
        "Filter Cutoff",
        juce::NormalisableRange<float>(20.0f, 20000.0f, 1.0f, 0.3f),
        20000.0f));

    // Filter resonance (0.1 to 10)
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "FILTER_RES",
        "Filter Resonance",
        juce::NormalisableRange<float>(0.1f, 10.0f, 0.1f),
        0.707f));

    // ADSR parameters
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "ATTACK",
        "Attack",
        juce::NormalisableRange<float>(0.001f, 2.0f, 0.001f),
        0.1f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "DECAY",
        "Decay",
        juce::NormalisableRange<float>(0.001f, 2.0f, 0.001f),
        0.1f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "SUSTAIN",
        "Sustain",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f),
        1.0f));

    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "RELEASE",
        "Release",
        juce::NormalisableRange<float>(0.001f, 5.0f, 0.001f),
        0.3f));

    // Master volume
    layout.add(std::make_unique<juce::AudioParameterFloat>(
        "VOLUME",
        "Master Volume",
        juce::NormalisableRange<float>(0.0f, 1.0f, 0.01f),
        0.5f));

    return layout;
}

const juce::String SonicTalesSynthAudioProcessor::getName() const
{
    return JucePlugin_Name;
}

bool SonicTalesSynthAudioProcessor::acceptsMidi() const
{
    return true;
}

bool SonicTalesSynthAudioProcessor::producesMidi() const
{
    return false;
}

bool SonicTalesSynthAudioProcessor::isMidiEffect() const
{
    return false;
}

double SonicTalesSynthAudioProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int SonicTalesSynthAudioProcessor::getNumPrograms()
{
    return 1;
}

int SonicTalesSynthAudioProcessor::getCurrentProgram()
{
    return 0;
}

void SonicTalesSynthAudioProcessor::setCurrentProgram(int index)
{
}

const juce::String SonicTalesSynthAudioProcessor::getProgramName(int index)
{
    return {};
}

void SonicTalesSynthAudioProcessor::changeProgramName(int index, const juce::String& newName)
{
}

void SonicTalesSynthAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    synth.setCurrentPlaybackSampleRate(sampleRate);

    for (int i = 0; i < synth.getNumVoices(); ++i)
    {
        if (auto voice = dynamic_cast<SynthVoice*>(synth.getVoice(i)))
        {
            voice->prepareToPlay(sampleRate, samplesPerBlock, getTotalNumOutputChannels());
        }
    }
}

void SonicTalesSynthAudioProcessor::releaseResources()
{
}

bool SonicTalesSynthAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
        && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return true;
}

void SonicTalesSynthAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    // Get parameter values
    int oscWave = apvts.getRawParameterValue("OSC_WAVE")->load();
    float filterCutoff = apvts.getRawParameterValue("FILTER_CUTOFF")->load();
    float filterRes = apvts.getRawParameterValue("FILTER_RES")->load();
    float attack = apvts.getRawParameterValue("ATTACK")->load();
    float decay = apvts.getRawParameterValue("DECAY")->load();
    float sustain = apvts.getRawParameterValue("SUSTAIN")->load();
    float release = apvts.getRawParameterValue("RELEASE")->load();
    float volume = apvts.getRawParameterValue("VOLUME")->load();

    // Update all voices with current parameter values
    for (int i = 0; i < synth.getNumVoices(); ++i)
    {
        if (auto voice = dynamic_cast<SynthVoice*>(synth.getVoice(i)))
        {
            voice->updateOscillator(oscWave);
            voice->updateFilter(filterCutoff, filterRes);
            voice->updateADSR(attack, decay, sustain, release);
        }
    }

    // Render the synth
    synth.renderNextBlock(buffer, midiMessages, 0, buffer.getNumSamples());

    // Apply master volume
    buffer.applyGain(volume);
}

bool SonicTalesSynthAudioProcessor::hasEditor() const
{
    return true;
}

juce::AudioProcessorEditor* SonicTalesSynthAudioProcessor::createEditor()
{
    return new SonicTalesSynthAudioProcessorEditor(*this);
}

void SonicTalesSynthAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void SonicTalesSynthAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

    if (xmlState.get() != nullptr)
        if (xmlState->hasTagName(apvts.state.getType()))
            apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new SonicTalesSynthAudioProcessor();
}
