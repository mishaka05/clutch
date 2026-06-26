/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Task } from '../../types';
import TaskCard from './TaskCard';

interface TaskMatrixProps {
  activeTasks: Task[];
  highestRiskTask: Task | null;
  onSelectTask: (task: Task) => void;
}

export default function TaskMatrix({ activeTasks, highestRiskTask, onSelectTask }: TaskMatrixProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Operational Task Matrix
        </h3>
        <span className="text-[10px] font-mono text-slate-500 uppercase">
          {activeTasks.length} active timelines
        </span>
      </div>

      {activeTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#0F1D30]/30 border border-dashed border-[#1C2F46] rounded-2xl text-center">
          <AlertTriangle className="text-slate-600 mb-3" size={32} />
          <p className="text-slate-400 text-sm font-sans font-medium">No deadlines recorded</p>
          <p className="text-slate-500 text-xs font-mono mt-1">Ingest a task above to initialize tracking metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Highlight Highest-Risk task in large format */}
          {highestRiskTask && (
            <TaskCard
              task={highestRiskTask}
              isLarge={true}
              onSelect={onSelectTask}
              onTriggerCrisis={() => {}}
            />
          )}

          {/* List remainder tasks */}
          {activeTasks
            .filter(t => t.id !== highestRiskTask?.id)
            .map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isLarge={false}
                onSelect={onSelectTask}
                onTriggerCrisis={() => {}}
              />
            ))}
        </div>
      )}
    </div>
  );
}
