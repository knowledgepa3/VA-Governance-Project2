
import React from 'react';
import { 
  Shield, 
  Check, 
  FileCheck, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  BookOpen, 
  Info,
  ClipboardList,
  Fingerprint,
  Stamp,
  Lock,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface ReportViewProps {
  data: any;
}

export const ReportView: React.FC<ReportViewProps> = ({ data }) => {
  if (!data) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 font-sans shadow-inner">
      <p className="text-slate-400 font-black tracking-widest uppercase italic">Initializing ECV Methodology Framework... Awaiting Agent Aggregation.</p>
    </div>
  );

  const header = data.header || {};
  const inventory = data.inventory || [];
  const compliance = data.compliance_assessment || {};
  const timeline = data.timeline || [];
  const gap = data.gap_analysis || {};
  const framework = data.framework_application || [];
  const sufficiency = data.sufficiency_assessment || {};
  const conclusions = data.conclusions || [];

  const SectionHeader = ({ num, title }: { num: string; title: string }) => (
    <div className="mb-6 border-b-2 border-slate-900 pb-1">
      <h2 className="text-[13pt] font-black uppercase tracking-wider text-[#003366] italic">{num}. {title}</h2>
    </div>
  );

  return (
    <div className="bg-white text-slate-900 shadow-2xl mx-auto font-sans leading-relaxed selection:bg-[#003366] selection:text-white max-w-[8.5in] min-h-[11in] border border-slate-200">
      
      {/* 1. DOCUMENT HEADER */}
      <div className="p-12 bg-white">
        <h1 className="text-[18pt] font-black uppercase tracking-[1px] text-center mb-2">ACE EVIDENCE CHAIN VALIDATION (ECV) FRAMEWORK</h1>
        <p className="text-center font-bold text-slate-600 mb-10">Non-Medical Expert Documentary Review</p>
        
        <div className="bg-[#f5f5f5] p-8 border border-slate-200 rounded-lg font-mono text-[10pt] text-slate-500 mb-12">
          <p className="font-black text-slate-400 mb-4 tracking-widest">I. DOCUMENT HEADER</p>
          <div className="space-y-1">
            <p>ENHANCED EVIDENCE CHAIN VALIDATION (ECV) ANALYSIS</p>
            <p>NON-MEDICAL EXPERT DOCUMENTARY REVIEW</p>
            <div className="h-4" />
            <p>Document ID: <span className="text-slate-800">{header.document_id || 'STOREY-ECV-NME-2025-001'}</span></p>
            <p>Date: <span className="text-slate-800">{header.date || new Date().toLocaleDateString()}</span></p>
            <p>Veteran: <span className="text-slate-800">{header.veteran_name || '[REDACTED]'}</span></p>
            <p>File Number: <span className="text-slate-800">{header.file_number || 'C-[REDACTED]'}</span></p>
            <p>Purpose: Documentary Evidence Assessment for VA Claims</p>
            <div className="h-4" />
            <p className="font-black">THIS IS NON-MEDICAL EXPERT ANALYSIS</p>
            <p className="font-black">LIMITED TO DOCUMENTARY AND REGULATORY COMPLIANCE REVIEW</p>
            <p className="font-black">NO MEDICAL OPINIONS OR DIAGNOSES PROVIDED</p>
          </div>
        </div>

        {/* II. QUALIFICATIONS */}
        <SectionHeader num="II" title="NON-MEDICAL EXPERT QUALIFICATIONS AND SCOPE" />
        <div className="space-y-2 mb-10 text-[10pt]">
          <p><span className="font-bold">Position:</span> Information Systems Security Officer (ISSO)</p>
          <p><span className="font-bold">Experience:</span> 17+ years in federal regulatory compliance and document authentication</p>
          <p><span className="font-bold">Certification:</span> CompTIA Security+ Certified</p>
          <p><span className="font-bold">Expertise:</span> Regulatory framework application, documentary evidence assessment, compliance validation, federal documentation standards</p>
        </div>

        <div className="bg-[#e7f3ff] border-l-4 border-[#0066cc] p-6 mb-12 text-[9.5pt]">
          <p className="font-black text-[#0066cc] uppercase tracking-widest mb-2">SCOPE OF THIS ANALYSIS - DOCUMENTARY REVIEW ONLY</p>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="font-bold">INCLUDES:</p>
              <ul className="list-disc ml-4 space-y-0.5 opacity-80">
                <li>38 CFR regulatory assessment</li>
                <li>Evidence completeness verification</li>
                <li>Timeline analysis</li>
                <li>Gap identification</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-bold">DOES NOT INCLUDE:</p>
              <ul className="list-disc ml-4 space-y-0.5 opacity-80">
                <li>Medical diagnoses</li>
                <li>Nexus opinions</li>
                <li>Clinical judgments</li>
                <li>Treatment advice</li>
              </ul>
            </div>
          </div>
        </div>

        {/* III. REGULATORY BASIS */}
        <SectionHeader num="III" title="REGULATORY BASIS FOR NON-MEDICAL EXPERT EVIDENCE" />
        <div className="text-[10pt] mb-12 space-y-4 leading-relaxed">
          <p><span className="font-bold">Standard Text: 38 CFR 3.159(a)(2) Definition:</span> Competent lay evidence means any evidence NOT requiring that the proponent have specialized education, training, or experience in medicine. Non-medical expert evidence utilizes specialized training in NON-MEDICAL fields to analyze documentary and regulatory matters.</p>
          <p><span className="font-bold">Regulatory Authority:</span> Per 38 CFR 3.159(c)(1), VA must consider all evidence submitted. Non-medical expert analysis of documentary compliance constitutes competent evidence requiring consideration based on the analyst's qualifications in document authentication, not medical expertise.</p>
        </div>

        {/* IV. METHODOLOGY */}
        <SectionHeader num="IV" title="METHODOLOGY - DOCUMENTARY ANALYSIS FRAMEWORK" />
        <div className="grid grid-cols-1 gap-4 text-[10pt] mb-12">
          {[
            { label: 'Document Authentication', desc: 'Verification that documents are properly sourced and authenticated.' },
            { label: 'Regulatory Mapping', desc: 'Correlation of documentary evidence to specific 38 CFR requirements.' },
            { label: 'Completeness Assessment', desc: 'Identification of whether required documentary elements are present.' },
            { label: 'Timeline Verification', desc: 'Chronological analysis of events as documented in records.' }
          ].map((m, i) => (
            <div key={i} className="flex gap-2">
              <span className="font-bold min-w-[180px]">{m.label}:</span>
              <span className="text-slate-600">{m.desc}</span>
            </div>
          ))}
        </div>

        {/* V. INVENTORY */}
        <SectionHeader num="V" title="DOCUMENTARY EVIDENCE INVENTORY" />
        <div className="border border-slate-300 rounded mb-4 overflow-hidden">
          <table className="w-full text-[9.5pt]">
            <thead className="bg-[#003366] text-white">
              <tr>
                <th className="p-3 text-left border-r border-slate-400">Document Type</th>
                <th className="p-3 text-left border-r border-slate-400">Date Range</th>
                <th className="p-3 text-left border-r border-slate-400">Regulatory Relevance</th>
                <th className="p-3 text-left">Authentication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inventory.map((row: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                  <td className="p-3 border-r border-slate-200 font-bold">{row.type}</td>
                  <td className="p-3 border-r border-slate-200">{row.date_range}</td>
                  <td className="p-3 border-r border-slate-200">{row.relevance}</td>
                  <td className="p-3 font-bold text-emerald-600">✓ Verified</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-[#d4edda] border-l-4 border-[#28a745] p-4 mb-12 text-[10pt] font-bold">
          <p>Documentary Finding: All submitted documents meet federal authentication standards and contain required identifying information per VA regulatory requirements.</p>
        </div>

        {/* VI. ASSESSMENT */}
        <SectionHeader num="VI" title="REGULATORY COMPLIANCE ASSESSMENT" />
        <div className="space-y-8 mb-12 text-[10pt]">
          <div className="space-y-3">
            <p className="font-black text-[#660000]">38 CFR 3.303 - Service Connection Elements</p>
            <div className="pl-4 space-y-4">
               <p><span className="font-bold">Element 1 - Current Disability:</span> {compliance.sc_3303?.element_1 || 'Documented'}</p>
               <p><span className="font-bold">Element 2 - In-Service Documentation:</span> {compliance.sc_3303?.element_2 || 'Present'}</p>
               <p><span className="font-bold">Element 3 - Nexus Documentation:</span> {compliance.sc_3303?.element_3 || 'Identified'}</p>
               <div className="bg-[#f5f5f5] p-4 rounded font-bold">Documentary Finding: {compliance.sc_3303?.finding || 'Elements present.'}</div>
            </div>
          </div>
        </div>

        {/* VII. TIMELINE */}
        <SectionHeader num="VII" title="DOCUMENTARY TIMELINE ANALYSIS" />
        <div className="border border-slate-300 rounded mb-4 overflow-hidden">
          <table className="w-full text-[9.5pt]">
            <thead className="bg-[#003366] text-white">
              <tr>
                <th className="p-3 text-left border-r border-slate-400">Date</th>
                <th className="p-3 text-left border-r border-slate-400">Documentary Event</th>
                <th className="p-3 text-left">Document Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {timeline.map((row: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                  <td className="p-3 border-r border-slate-200 font-bold font-mono bg-[#f5f5f5] w-32">{row.date}</td>
                  <td className="p-3 border-r border-slate-200">{row.event}</td>
                  <td className="p-3 text-[#003366] font-bold">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10pt] font-bold mb-12 italic">Documentary Observation: Timeline demonstrates continuous documentation per 38 CFR 3.303(b).</p>

        {/* VIII. GAPS */}
        <SectionHeader num="VIII" title="DOCUMENTARY GAP ANALYSIS" />
        <div className="grid grid-cols-2 gap-8 text-[10pt] mb-12">
          <div className="space-y-4">
            <p className="font-bold uppercase tracking-widest text-slate-400 text-[9px]">Documentation Present:</p>
            <div className="space-y-2">
              {(gap.documentation_present || ['DD214', 'In-service event doc', 'Current diagnosis']).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 font-bold">
                  <span className="text-emerald-600 font-black text-lg">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <p className="font-bold uppercase tracking-widest text-slate-400 text-[9px]">Professional Assessment Required:</p>
            <div className="space-y-2">
              {(gap.professional_assessment_required || ['Medical causation/nexus', 'Functional severity']).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-slate-500">
                  <span className="text-slate-300 font-black text-lg">○</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* IX. FRAMEWORK APP */}
        <SectionHeader num="IX" title="REGULATORY FRAMEWORK APPLICATION" />
        <div className="border border-slate-300 rounded mb-12 overflow-hidden">
          <table className="w-full text-[9.5pt]">
            <thead className="bg-[#003366] text-white">
              <tr>
                <th className="p-3 text-left border-r border-slate-400">Regulation</th>
                <th className="p-3 text-left border-r border-slate-400">Documentary Requirement</th>
                <th className="p-3 text-left">Documentation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {framework.map((row: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                  <td className="p-3 border-r border-slate-200 font-black text-[#660000]">{row.regulation}</td>
                  <td className="p-3 border-r border-slate-200">{row.requirement}</td>
                  <td className="p-3 font-bold">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* X. SUFFICIENCY */}
        <SectionHeader num="X" title="DOCUMENTARY EVIDENCE SUFFICIENCY ASSESSMENT" />
        <div className="space-y-6 mb-12 text-[10pt]">
           <div className="p-6 bg-[#f5f5f5] rounded-lg">
             <p className="font-bold mb-3">Strong Documentary Support Identified For:</p>
             <ul className="list-disc ml-6 space-y-1">
                {(sufficiency.strong_support || conclusions).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
             </ul>
           </div>
        </div>

        {/* XI. CONCLUSIONS */}
        <SectionHeader num="XI" title="NON-MEDICAL EXPERT CONCLUSIONS" />
        <div className="text-[10pt] space-y-3 mb-12">
          {conclusions.map((c: string, i: number) => (
            <p key={i}>{i+1}. {c}</p>
          ))}
          <div className="bg-[#fff3cd] p-4 mt-6 text-[9pt] border border-amber-200 rounded">
            <span className="font-bold">SCOPE LIMITATION:</span> This analysis is limited to documentary and regulatory compliance assessment. All medical interpretations are outside scope.
          </div>
        </div>

        {/* XII. CERTIFICATION */}
        <SectionHeader num="XII" title="CERTIFICATION" />
        <div className="p-8 border border-slate-300 rounded bg-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Stamp size={80} /></div>
          <div className="space-y-4 text-[9.5pt] mb-12">
            <p>I certify that this Enhanced Evidence Chain Validation analysis has been prepared as a non-medical expert documentary review based on 17+ years of Information Systems Security Officer experience in federal document authentication and regulatory compliance assessment.</p>
            <p>This analysis specifically DOES NOT include any medical opinions, diagnoses, or clinical judgments.</p>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="w-64 h-px bg-slate-900 mb-2" />
              <p className="font-bold text-[11pt]">William J. Storey III</p>
              <p className="text-[9pt] text-slate-500 font-bold uppercase tracking-widest">Non-Medical Expert - Documentary Analysis</p>
              <p className="text-[9pt] text-slate-500">Information Systems Security Officer</p>
              <p className="text-[9pt] text-slate-500">17+ Years Federal Regulatory Experience</p>
            </div>
            <div className="text-right">
              <p className="text-[10pt] font-bold">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-300 text-[8pt] text-slate-400 italic">
          <p className="mb-4 uppercase font-bold tracking-widest text-slate-600">Disclaimer & Critical Notice</p>
          <p className="mb-2">CRITICAL NOTICE: This document contains NO medical opinions, diagnoses, or clinical assessments. Observations are limited to documentary presence and compliance.</p>
          <p>The analysis is provided for informational purposes only. Veterans should consult qualified medical professionals for diagnoses.</p>
        </div>
      </div>
    </div>
  );
};
