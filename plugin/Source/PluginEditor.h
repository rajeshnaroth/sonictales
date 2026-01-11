#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

class SonicTalesSynthAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    SonicTalesSynthAudioProcessorEditor(SonicTalesSynthAudioProcessor&);
    ~SonicTalesSynthAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    SonicTalesSynthAudioProcessor& audioProcessor;

    // Oscillator controls
    juce::ComboBox oscWaveformBox;
    juce::Label oscWaveformLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> oscWaveformAttachment;

    // Filter controls
    juce::Slider filterCutoffSlider;
    juce::Label filterCutoffLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> filterCutoffAttachment;

    juce::Slider filterResSlider;
    juce::Label filterResLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> filterResAttachment;

    // ADSR controls
    juce::Slider attackSlider;
    juce::Label attackLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> attackAttachment;

    juce::Slider decaySlider;
    juce::Label decayLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> decayAttachment;

    juce::Slider sustainSlider;
    juce::Label sustainLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> sustainAttachment;

    juce::Slider releaseSlider;
    juce::Label releaseLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> releaseAttachment;

    // Master volume
    juce::Slider volumeSlider;
    juce::Label volumeLabel;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> volumeAttachment;

    void setupSlider(juce::Slider& slider, juce::Label& label,
                     const juce::String& labelText,
                     std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>& attachment,
                     const juce::String& parameterId);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SonicTalesSynthAudioProcessorEditor)
};
