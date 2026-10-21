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
