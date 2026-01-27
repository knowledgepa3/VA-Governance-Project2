/**
 * BD Dashboard - Main View
 *
 * What this does:
 * - Shows portfolio summary (total opps, pipeline value, etc.)
 * - Lists all opportunities with status
 * - Allows qualification of new RFPs
 * - Filters by bid decision
 *
 * Think of this as the "mission control" for BD team
 */

import React, { useState, useEffect } from 'react';
import { BDWorkforce, BDOpportunity, OpportunityStatus, BidDecision } from '../bdWorkforce';
import { TrendingUp, DollarSign, CheckCircle, XCircle, AlertCircle, PlayCircle } from 'lucide-react';

export const BDDashboard: React.FC = () => {
  // STATE - This is the data the component tracks
  const [workforce, setWorkforce] = useState<BDWorkforce | null>(null);
  const [opportunities, setOpportunities] = useState<BDOpportunity[]>([]);
  const [isQualifying, setIsQualifying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'strong' | 'qualified' | 'no-bid'>('all');

  // INITIALIZATION - Set up the BD workforce when component loads
  useEffect(() => {
    const bdTeam = new BDWorkforce();

    // Add team members (simulating your BD team)
    bdTeam.addTeamMember({
      id: 'alice',
      name: 'Alice Johnson',
      role: 'BD_MANAGER',
      currentWorkload: 0,
      maxWorkload: 10,
      specializations: ['541511', '541512']
    });

    bdTeam.addTeamMember({
      id: 'bob',
      name: 'Bob Smith',
      role: 'CAPTURE_MANAGER',
      currentWorkload: 0,
      maxWorkload: 8,
      specializations: ['541330']
    });

    setWorkforce(bdTeam);

    // Load any existing opportunities (in real app, fetch from database)
    const portfolio = bdTeam.getPortfolio();
    setOpportunities(portfolio.opportunities);
  }, []);

  // INGEST RFPs - Load new opportunities
  const handleIngestRFPs = async () => {
    if (!workforce) return;

    // Sample RFPs (in real app, this comes from CSV upload or SAM.gov feed)
    const sampleRFPs = [
      {
        rfpNumber: '140D0423R0003',
        title: 'IT Support Services - VA',
        agency: 'Department of Veterans Affairs',
        estimatedValue: 2500000,
        deadline: new Date('2024-03-15')
      },
      {
        rfpNumber: '70CMSD24R00000071',
        title: 'Cloud Migration - GSA',
        agency: 'General Services Administration',
        estimatedValue: 4200000,
        deadline: new Date('2024-03-25')
      },
      {
        rfpNumber: 'HHS75N98023R00123',
        title: 'Healthcare IT Modernization',
        agency: 'HHS',
        estimatedValue: 5500000,
        deadline: new Date('2024-04-20')
      },
      {
        rfpNumber: '693JJ324Q000001',
        title: 'NASA Mission Support',
        agency: 'NASA',
        estimatedValue: 1200000,
        deadline: new Date('2024-03-20')
      },
      {
        rfpNumber: 'EPA-DC-DW-24-01',
        title: 'Environmental Data Portal',
        agency: 'EPA',
        estimatedValue: 980000,
        deadline: new Date('2024-03-28')
      }
    ];

    await workforce.ingestOpportunities(sampleRFPs);

    const portfolio = workforce.getPortfolio();
    setOpportunities(portfolio.opportunities);
  };

  // QUALIFY OPPORTUNITIES - Run the AI analysis
  const handleQualify = async () => {
    if (!workforce) return;

    setIsQualifying(true);

    try {
      // Company profile (in real app, stored in settings)
      const companyProfile = {
        ourNaicsCodes: '541511,541512,541519,541330',
        ourCertifications: 'SDVOSB,ISO27001,CMMC-L2',
        minContractValue: 500000,
        maxContractValue: 8000000
      };

      await workforce.qualifyOpportunities(companyProfile);

      const portfolio = workforce.getPortfolio();
      setOpportunities(portfolio.opportunities);
    } catch (error) {
      console.error('Qualification error:', error);
      alert('Error during qualification. Check console for details.');
    } finally {
      setIsQualifying(false);
    }
  };

  // FILTER OPPORTUNITIES
  const filteredOpportunities = opportunities.filter(opp => {
    if (filter === 'all') return true;
    if (filter === 'strong') return opp.bidDecision === BidDecision.STRONG_BID;
    if (filter === 'qualified') return opp.bidDecision === BidDecision.BID;
    if (filter === 'no-bid') return opp.bidDecision === BidDecision.NO_BID;
    return true;
  });

  // CALCULATE METRICS
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0);
  const strongBids = opportunities.filter(o => o.bidDecision === BidDecision.STRONG_BID).length;
  const qualified = opportunities.filter(o => o.bidDecision === BidDecision.BID).length;
  const noBids = opportunities.filter(o => o.bidDecision === BidDecision.NO_BID).length;
  const avgWinProb = opportunities.length > 0
    ? opportunities.reduce((sum, o) => sum + (o.winProbability || 0), 0) / opportunities.length
    : 0;

  // RENDER - What the user sees
  return (
    <div className="bd-dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Business Development Dashboard</h1>
        <p className="subtitle">Governed RFP Qualification Pipeline</p>
      </div>

      {/* ACTION BAR */}
      <div className="action-bar">
        <button
          className="btn btn-primary"
          onClick={handleIngestRFPs}
          disabled={isQualifying}
        >
          📥 Ingest RFPs
        </button>

        <button
          className="btn btn-success"
          onClick={handleQualify}
          disabled={opportunities.length === 0 || isQualifying}
        >
          {isQualifying ? (
            <>
              <span className="spinner"></span> Qualifying...
            </>
          ) : (
            <>
              <PlayCircle size={16} /> Qualify All
            </>
          )}
        </button>

        <div className="filter-buttons">
          <button
            className={`btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({opportunities.length})
          </button>
          <button
            className={`btn ${filter === 'strong' ? 'active' : ''}`}
            onClick={() => setFilter('strong')}
          >
            Strong Bids ({strongBids})
          </button>
          <button
            className={`btn ${filter === 'qualified' ? 'active' : ''}`}
            onClick={() => setFilter('qualified')}
          >
            Qualified ({qualified})
          </button>
          <button
            className={`btn ${filter === 'no-bid' ? 'active' : ''}`}
            onClick={() => setFilter('no-bid')}
          >
            No-Bids ({noBids})
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Opportunities</div>
            <div className="metric-value">{opportunities.length}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Strong Bids</div>
            <div className="metric-value">{strongBids}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Pipeline Value</div>
            <div className="metric-value">${(totalValue / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon warning">
            <AlertCircle size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Avg Win Probability</div>
            <div className="metric-value">{avgWinProb.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* OPPORTUNITIES LIST */}
      <div className="opportunities-section">
        <h2>Opportunities ({filteredOpportunities.length})</h2>

        {filteredOpportunities.length === 0 ? (
          <div className="empty-state">
            <p>No opportunities yet.</p>
            <p>Click "Ingest RFPs" to load sample opportunities, then "Qualify All" to analyze them.</p>
          </div>
        ) : (
          <div className="opportunities-list">
            {filteredOpportunities.map(opp => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="dashboard-footer">
        <p>
          <strong>MAI Governance:</strong> All actions logged with audit trail.
          Evidence packs generated for each opportunity.
        </p>
      </div>
    </div>
  );
};

/**
 * OPPORTUNITY CARD - Individual RFP display
 *
 * What this shows:
 * - RFP number and title
 * - Agency and value
 * - Win probability
 * - Bid decision
 * - Status
 */
interface OpportunityCardProps {
  opportunity: BDOpportunity;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const getBidDecisionColor = (decision?: BidDecision) => {
    switch (decision) {
      case BidDecision.STRONG_BID: return 'success';
      case BidDecision.BID: return 'info';
      case BidDecision.BID_WITH_CAUTION: return 'warning';
      case BidDecision.NO_BID: return 'danger';
      case BidDecision.NEEDS_REVIEW: return 'warning';
      default: return 'neutral';
    }
  };

  const getBidDecisionLabel = (decision?: BidDecision) => {
    switch (decision) {
      case BidDecision.STRONG_BID: return '🎯 Strong Bid';
      case BidDecision.BID: return '✅ Bid';
      case BidDecision.BID_WITH_CAUTION: return '⚠️ Bid w/ Caution';
      case BidDecision.NO_BID: return '❌ No-Bid';
      case BidDecision.NEEDS_REVIEW: return '👀 Needs Review';
      default: return 'Pending';
    }
  };

  return (
    <div className="opportunity-card">
      <div className="card-header">
        <div>
          <h3>{opportunity.rfpNumber}</h3>
          <p className="opportunity-title">{opportunity.title}</p>
        </div>
        <div className={`badge badge-${getBidDecisionColor(opportunity.bidDecision)}`}>
          {getBidDecisionLabel(opportunity.bidDecision)}
        </div>
      </div>

      <div className="card-body">
        <div className="opportunity-details">
          <div className="detail-item">
            <span className="label">Agency:</span>
            <span className="value">{opportunity.agency}</span>
          </div>
          <div className="detail-item">
            <span className="label">Value:</span>
            <span className="value">${(opportunity.estimatedValue / 1000000).toFixed(2)}M</span>
          </div>
          <div className="detail-item">
            <span className="label">Deadline:</span>
            <span className="value">{opportunity.deadline.toLocaleDateString()}</span>
          </div>
          <div className="detail-item">
            <span className="label">Win Prob:</span>
            <span className="value">
              {opportunity.winProbability
                ? `${opportunity.winProbability.toFixed(1)}%`
                : 'N/A'
              }
            </span>
          </div>
        </div>

        {opportunity.capabilityGaps && opportunity.capabilityGaps.length > 0 && (
          <div className="capability-gaps">
            <strong>Gaps:</strong> {opportunity.capabilityGaps.join(', ')}
          </div>
        )}

        {opportunity.teamingRequired && (
          <div className="teaming-badge">
            🤝 Teaming Recommended
          </div>
        )}
      </div>

      <div className="card-footer">
        <button className="btn btn-small">View Details</button>
        <button className="btn btn-small">Evidence Pack</button>
        <span className="assigned-to">
          Assigned to: {opportunity.assignedTo || 'Unassigned'}
        </span>
      </div>
    </div>
  );
};
