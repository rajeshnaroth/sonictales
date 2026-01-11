#include "PluginProcessor.h"
#include "PluginEditor.h"

SonicTalesSynthAudioProcessorEditor::SonicTalesSynthAudioProcessorEditor(SonicTalesSynthAudioProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p)
{
    setSize(600, 400);

    // Setup oscillator waveform selector
    oscWaveformLabel.setText("Waveform", juce::dontSendNotification);
    oscWaveformLabel.attachToComponent(&oscWaveformBox, true);
    addAndMakeVisible(oscWaveformLabel);

    oscWaveformBox.addItem("Sine", 1);
    oscWaveformBox.addItem("Saw", 2);
    oscWaveformBox.addItem("Square", 3);
    addAndMakeVisible(oscWaveformBox);
    oscWaveformAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
        audioProcessor.getAPVTS(), "OSC_WAVE", oscWaveformBox);

    // Setup sliders
    setupSlider(filterCutoffSlider, filterCutoffLabel, "Cutoff",
                filterCutoffAttachment, "FILTER_CUTOFF");

    setupSlider(filterResSlider, filterResLabel, "Resonance",
                filterResAttachment, "FILTER_RES");

    setupSlider(attackSlider, attackLabel, "Attack",
                attackAttachment, "ATTACK");

    setupSlider(decaySlider, decayLabel, "Decay",
                decayAttachment, "DECAY");

    setupSlider(sustainSlider, sustainLabel, "Sustain",
                sustainAttachment, "SUSTAIN");

    setupSlider(releaseSlider, releaseLabel, "Release",
                releaseAttachment, "RELEASE");

    setupSlider(volumeSlider, volumeLabel, "Volume",
                volumeAttachment, "VOLUME");
}

SonicTalesSynthAudioProcessorEditor::~SonicTalesSynthAudioProcessorEditor()
{
}

void SonicTalesSynthAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::darkgrey);

    g.setColour(juce::Colours::white);
    g.setFont(20.0f);
    g.drawFittedText("SonicTales Synth", getLocalBounds().removeFromTop(40),
                     juce::Justification::centred, 1);

    // Section headers
    g.setFont(14.0f);
    g.drawText("Oscillator", 20, 50, 150, 20, juce::Justification::left);
    g.drawText("Filter", 20, 120, 150, 20, juce::Justification::left);
    g.drawText("Envelope", 300, 50, 150, 20, juce::Justification::left);
    g.drawText("Master", 300, 280, 150, 20, juce::Justification::left);
}

void SonicTalesSynthAudioProcessorEditor::resized()
{
    auto bounds = getLocalBounds();
    bounds.removeFromTop(50);

    // Oscillator section
    auto oscBounds = bounds.removeFromLeft(280);
    oscBounds.removeFromTop(20);
    oscWaveformBox.setBounds(oscBounds.removeFromTop(30).withTrimmedLeft(100));

    oscBounds.removeFromTop(20);

    // Filter section
    oscBounds.removeFromTop(20);
    filterCutoffSlider.setBounds(oscBounds.removeFromTop(60).withTrimmedLeft(100));
    filterResSlider.setBounds(oscBounds.removeFromTop(60).withTrimmedLeft(100));

    // Envelope section
    auto envBounds = bounds;
    envBounds.removeFromTop(20);
    attackSlider.setBounds(envBounds.removeFromTop(50).withTrimmedLeft(100));
    decaySlider.setBounds(envBounds.removeFromTop(50).withTrimmedLeft(100));
    sustainSlider.setBounds(envBounds.removeFromTop(50).withTrimmedLeft(100));
    releaseSlider.setBounds(envBounds.removeFromTop(50).withTrimmedLeft(100));

    envBounds.removeFromTop(20);
    volumeSlider.setBounds(envBounds.removeFromTop(50).withTrimmedLeft(100));
}

void SonicTalesSynthAudioProcessorEditor::setupSlider(
    juce::Slider& slider, juce::Label& label,
    const juce::String& labelText,
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>& attachment,
    const juce::String& parameterId)
{
    slider.setSliderStyle(juce::Slider::LinearHorizontal);
    slider.setTextBoxStyle(juce::Slider::TextBoxRight, false, 60, 20);
    addAndMakeVisible(slider);

    label.setText(labelText, juce::dontSendNotification);
    label.attachToComponent(&slider, true);
    addAndMakeVisible(label);

    attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.getAPVTS(), parameterId, slider);
}
