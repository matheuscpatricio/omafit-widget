export type {
  VoiceUiState,
  VoiceTransportEvent,
  VoiceStructuredUiEvent,
  VoiceSessionMetrics,
  VoiceProofScenarioResult,
} from './types';

export {
  createVoiceSessionMachineState,
  reduceVoiceSession,
  markProductsUiRendered,
  type VoiceSessionMachineState,
} from './sessionMachine';

export {
  mapClientToolToStructuredActions,
  structuredUiEventFromToolCall,
  computeAlignmentCoverage,
} from './protocolBridge';

export { runMockVoiceConversation } from './mockElevenLabsTransport';

export {
  runVoiceProof,
  formatVoiceProofMarkdown,
  type VoiceProofReport,
} from './proof/runVoiceProof';

export {
  createElevenLabsTransport,
  type VoiceClientToolHandler,
  type VoiceTransport,
  type VoiceTransportHandle,
  type VoiceTransportStartOptions,
} from './elevenLabsTransport';

export {
  createVoiceSessionController,
  type VoiceControllerState,
  type VoiceSessionContext,
  type VoiceSessionController,
} from './voiceSessionController';
