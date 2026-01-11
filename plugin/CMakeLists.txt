cmake_minimum_required(VERSION 3.15)

project(SonicTalesSynth VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add JUCE as a subdirectory (you'll need to have JUCE in your project)
# You can add JUCE via git submodule or download it separately
# For this example, we assume JUCE is at the same level as the plugin folder
# Adjust the path as needed
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../JUCE ${CMAKE_CURRENT_BINARY_DIR}/JUCE)

# Add the plugin target
juce_add_plugin(SonicTalesSynth
    COMPANY_NAME "SonicTales Productions"
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE STPr
    PLUGIN_CODE STsy
    FORMATS AU VST3
    PRODUCT_NAME "SonicTalesSynth"
)

# Add source files
target_sources(SonicTalesSynth
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginEditor.cpp
        Source/SynthVoice.cpp
        Source/Oscillator.cpp
)

# Preprocessor definitions
target_compile_definitions(SonicTalesSynth
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
)

# Link JUCE modules
target_link_libraries(SonicTalesSynth
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)
