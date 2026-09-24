import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Play, Sparkles } from 'lucide-react';

const STEPS = [
  { num: 1, title: 'Upload Dataset', page: 'datasets', desc: 'Upload CSV or click 1-Click Sample Dataset' },
  { num: 2, title: 'Select Target Column', page: 'datasets', desc: 'Choose classification target (e.g. churn)' },
  { num: 3, title: 'Analyze Dataset', page: 'datasets', desc: 'Review row count, nulls, duplicates & preview' },
  { num: 4, title: 'Clean Dataset', page: 'processing', desc: 'Impute missing values, remove duplicates & clip outliers' },
  { num: 5, title: 'Start AutoML', page: 'automl', desc: 'Run Optuna optimization across 5 ML algorithms' },
  { num: 6, title: 'Model Leaderboard', page: 'leaderboard', desc: 'Compare real Accuracy, F1, Precision & Recall' },
  { num: 7, title: 'Select Best Model', page: 'leaderboard', desc: 'Auto-ranked champion model identified' },
  { num: 8, title: 'Register Model', page: 'registry', desc: 'Versioned (v1, v2) with full artifact metadata' },
  { num: 9, title: 'Deploy Model', page: 'registry', desc: 'Hot-promoted to Production REST runtime' },
  { num: 10, title: 'Make Prediction', page: 'prediction', desc: 'Real-time inference with probability & latency' },
  { num: 11, title: 'View Monitoring', page: 'monitoring', desc: 'Track request rate, latency, and system health' },
  { num: 12, title: 'Simulate Drift', page: 'drift', desc: 'Click button to generate shifted feature data' },
  { num: 13, title: 'Show Drift Alert', page: 'drift', desc: 'PSI exceeds 0.25 threshold, triggering warning' },
  { num: 14, title: 'Start Retraining', page: 'drift', desc: 'Automated retraining trigger producing model v2' }
];

export default function DemoStepper({ setActivePage }) {
  const [currentStep, setCurrentStep] = useState(1);

  const step = STEPS[currentStep - 1];

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
      setActivePage(STEPS[nextStepNum - 1].page);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      const prevStepNum = currentStep - 1;
      setCurrentStep(prevStepNum);
      setActivePage(STEPS[prevStepNum - 1].page);
    }
  };

  const handleJump = (idx) => {
    setCurrentStep(idx + 1);
    setActivePage(STEPS[idx].page);
  };

  return (
    <div className="bg-gradient-to-r from-brand-900/30 via-slate-900 to-indigo-950/30 border border-brand-500/20 rounded-2xl p-4 sm:p-5 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-brand-500/20 text-brand-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-brand-400">
              Professor Viva & Demo Walkthrough Guide
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            Step {step.num} of 14: <span className="text-brand-300">{step.title}</span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {step.desc}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              Previous
            </button>
          )}

          <button
            onClick={() => setActivePage(step.page)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-brand-300 border border-brand-500/30 transition"
          >
            <Play className="w-3 h-3" />
            <span>Open Page</span>
          </button>

          {currentStep < 14 && (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between overflow-x-auto pb-1 gap-1">
          {STEPS.map((s, idx) => {
            const isCompleted = idx + 1 < currentStep;
            const isCurrent = idx + 1 === currentStep;

            return (
              <button
                key={s.num}
                onClick={() => handleJump(idx)}
                className={`flex-shrink-0 flex items-center space-x-1 text-[11px] px-2 py-1 rounded-md transition ${
                  isCurrent
                    ? 'bg-brand-600 text-white font-bold'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={`Step ${s.num}: ${s.title}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                    {s.num}
                  </span>
                )}
                <span className="hidden xl:inline">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
