import React from 'react';
import { Calculator, TrendingUp, BarChart3 } from 'lucide-react';
import { GradingRule, POMSpecification } from '../types';
import { useI18n } from '../lib/i18n';
import { GradingTable } from './GradingTable';

interface GradingCalculatorProps {
  gradingRules: GradingRule[];
  pomSpecs: POMSpecification[];
  onUpdateRules: (rules: GradingRule[]) => void;
}

export const GradingCalculator: React.FC<GradingCalculatorProps> = ({
  gradingRules,
  pomSpecs,
  onUpdateRules
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('grading.calculator')}</h3>
          <p className="text-sm text-gray-600">Calculate measurements across size ranges using grading rules</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-teal-600" />
          <span className="text-sm text-gray-600">Advanced grading engine</span>
        </div>
      </div>

      {/* Grading Table Component */}
      <GradingTable
        gradingRules={gradingRules}
        pomSpecs={pomSpecs}
        onUpdateRules={onUpdateRules}
      />
    </div>
  );
};
