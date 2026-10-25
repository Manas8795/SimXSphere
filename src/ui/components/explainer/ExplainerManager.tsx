import React, { useState } from 'react';
import type { SimulationExplainerContext, RuntimeConnectionStatus } from '../../../core/explainer/types';
import { ExplainerBubble } from './ExplainerBubble';
import { ExplainerPanel } from './ExplainerPanel';

interface ExplainerManagerProps {
  activeContext: SimulationExplainerContext;
  priorContext?: SimulationExplainerContext | null;
}

export const ExplainerManager: React.FC<ExplainerManagerProps> = ({
  activeContext,
  priorContext,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [status, setStatus] = useState<RuntimeConnectionStatus>('idle');

  return (
    <>
      {/* Small floating companion bubble in the top right corner */}
      <ExplainerBubble
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        status={status}
        isGenerating={false}
        isSpeakingAudio={isSpeaking}
        simulationTitle={activeContext.simulationTitle}
      />

      {/* Popover explainer drawer/modal */}
      <ExplainerPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        activeContext={activeContext}
        priorContext={priorContext}
        onSpeakingChange={(speaking) => setIsSpeaking(speaking)}
        onStatusChange={(newStatus) => setStatus(newStatus)}
      />
    </>
  );
};
