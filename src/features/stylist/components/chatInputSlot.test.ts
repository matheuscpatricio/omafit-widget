import { describe, expect, it } from 'vitest';
import { chatInputSlot, shouldShowVoiceButton } from './StylistVoiceControls';

describe('chatInputSlot', () => {
  it('always shows send when voice feature is off', () => {
    expect(chatInputSlot({ featureOn: false, inputValue: '', voiceActive: false })).toBe('send');
    expect(shouldShowVoiceButton({ featureOn: false, inputValue: '', voiceActive: false })).toBe(false);
  });
  it('shows mic while input is empty or whitespace', () => {
    expect(chatInputSlot({ featureOn: true, inputValue: '', voiceActive: false })).toBe('voice-start');
    expect(chatInputSlot({ featureOn: true, inputValue: '   ', voiceActive: false })).toBe('voice-start');
  });
  it('swaps to send once the user types', () => {
    expect(chatInputSlot({ featureOn: true, inputValue: 'oi', voiceActive: false })).toBe('send');
    expect(chatInputSlot({ featureOn: true, inputValue: 'oi', voiceActive: true })).toBe('send');
  });
  it('shows stop while voice is active and input is empty', () => {
    expect(chatInputSlot({ featureOn: true, inputValue: '', voiceActive: true })).toBe('voice-stop');
  });
});
