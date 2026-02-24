import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Activity,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function AIObservability() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    loadData();
  }, [hours]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, summaryRes] = await Promise.all([
        adminService.getObservabilityStatus(),
        adminService.getObservabilitySummary(hours)
      ]);

      if (statusRes.success) setStatus(statusRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load observability data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading AI observability..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl text-white">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Observability</h1>
            <p className="text-gray-400">Monitor AI agent performance with Langfuse</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl ${
          status?.enabled
            ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30'
            : 'bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status?.enabled ? (
              <CheckCircle className="text-green-500" size={32} />
            ) : (
              <AlertCircle className="text-red-500" size={32} />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {status?.enabled ? 'Observability Active' : 'Observability Disabled'}
              </h2>
              <p className="text-gray-400">
                Provider: {status?.provider || 'Not configured'}
              </p>
            </div>
          </div>
          {status?.dashboard_url && (
            <a
              href={status.dashboard_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
            >
              Open Langfuse Dashboard
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {status?.features && Object.entries(status.features).map(([feature, enabled], index) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-xl border ${
              enabled
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {enabled ? (
                <CheckCircle className="text-green-500" size={16} />
              ) : (
                <AlertCircle className="text-gray-500" size={16} />
              )}
              <span className={enabled ? 'text-green-400' : 'text-gray-400'}>
                {enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-white font-medium capitalize">
              {feature.replace(/_/g, ' ')}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-5 rounded-2xl border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Activity className="text-blue-400" size={20} />
              </div>
              <span className="text-gray-400">Total Traces</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.summary?.total_traces || 'N/A'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 p-5 rounded-2xl border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="text-purple-400" size={20} />
              </div>
              <span className="text-gray-400">LLM Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.summary?.total_llm_calls || 'N/A'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 p-5 rounded-2xl border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Clock className="text-cyan-400" size={20} />
              </div>
              <span className="text-gray-400">Avg Latency</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.summary?.avg_latency_ms || 'N/A'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-5 rounded-2xl border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="text-red-400" size={20} />
              </div>
              <span className="text-gray-400">Error Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.summary?.error_rate || 'N/A'}
            </p>
          </motion.div>
        </div>
      )}

      {/* Agent Breakdown */}
      {summary?.agent_breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <h3 className="font-bold text-white mb-4">Agent Performance</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(summary.agent_breakdown).map(([agent, data]) => (
              <div
                key={agent}
                className="p-4 bg-gray-700/50 rounded-xl"
              >
                <h4 className="font-medium text-white capitalize mb-2">
                  {agent.replace(/_/g, ' ')}
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    Calls: <span className="text-white">{data.calls || 'N/A'}</span>
                  </p>
                  <p className="text-gray-400">
                    Avg Latency: <span className="text-white">{data.avg_latency || 'N/A'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/30 p-6 rounded-2xl">
        <h3 className="font-bold text-purple-400 mb-2">About AI Observability</h3>
        <p className="text-gray-300 text-sm">
          This dashboard shows AI agent performance metrics tracked via Langfuse. You can monitor:
        </p>
        <ul className="mt-3 text-sm text-gray-400 space-y-1">
          <li>• Trace tracking for all AI interactions</li>
          <li>• LLM call monitoring with token usage</li>
          <li>• Cost tracking per request</li>
          <li>• Latency analysis for optimization</li>
          <li>• Error tracking and debugging</li>
        </ul>
      </div>
    </div>
  );
}