/**
 * VA Legal Knowledge Base
 *
 * Comprehensive legal authorities for VA disability claims:
 * - 38 CFR (Code of Federal Regulations)
 * - M21-1 Adjudication Procedures Manual
 * - Federal Circuit Court Decisions
 * - CAVC (Court of Appeals for Veterans Claims) Decisions
 * - BVA (Board of Veterans' Appeals) Precedent
 * - Key Legal Principles
 */

// ============================================================================
// CORE LEGAL PRINCIPLES
// ============================================================================

export const CORE_PRINCIPLES = {
  BENEFIT_OF_THE_DOUBT: {
    name: 'Benefit of the Doubt',
    statute: '38 U.S.C. § 5107(b)',
    regulation: '38 CFR § 3.102',
    principle: 'When there is an approximate balance of positive and negative evidence, the benefit of the doubt shall be given to the claimant.',
    application: 'If evidence is in equipoise (50/50), the veteran WINS. VA must resolve reasonable doubt in favor of the veteran.',
    keyCase: 'Gilbert v. Derwinski, 1 Vet. App. 49 (1990)',
    gilbertHolding: 'The standard is not whether the evidence supports the claim or is in equipoise, but whether the preponderance of evidence is AGAINST the claim. If not, the veteran wins.',
    raterInstruction: 'Before denying ANY claim, ask: Is the preponderance of evidence truly AGAINST this veteran? If there is any reasonable doubt, GRANT.',
    quotable: '"A veteran need only demonstrate that there is an approximate balance of positive and negative evidence in order to prevail." - Gilbert v. Derwinski'
  },

  DUTY_TO_ASSIST: {
    name: 'Duty to Assist',
    statute: '38 U.S.C. § 5103A',
    regulation: '38 CFR § 3.159',
    principle: 'VA has a duty to assist claimants in obtaining evidence necessary to substantiate claims.',
    requirements: [
      'Obtain relevant Federal records (VA treatment, Social Security, military)',
      'Make reasonable efforts to obtain private records',
      'Provide medical examination when evidence indicates current disability may be connected to service',
      'Notify claimant of inability to obtain records'
    ],
    keyCase: 'Barr v. Nicholson, 21 Vet. App. 303 (2007)',
    barrHolding: 'Once VA undertakes to provide an examination, it must provide an ADEQUATE one. An inadequate exam is a violation of the duty to assist.'
  },

  PRO_CLAIMANT_SYSTEM: {
    name: 'Non-Adversarial Pro-Claimant System',
    principle: 'The VA claims system is designed to be veteran-friendly and non-adversarial.',
    keyCase: 'Hodge v. West, 155 F.3d 1356 (Fed. Cir. 1998)',
    application: 'VA must liberally construe all claims, submissions, and evidence in the light most favorable to the veteran.',
    sympatheticReading: 'All pro se filings must be read sympathetically - Robinson v. Shinseki, 557 F.3d 1355 (Fed. Cir. 2009)'
  },

  EVERY_THEORY_OF_ENTITLEMENT: {
    name: 'All Theories Must Be Considered',
    keyCase: 'Hickson v. West, 12 Vet. App. 247 (1999)',
    principle: 'VA must consider ALL theories of entitlement raised by the evidence, not just those explicitly claimed.',
    examples: [
      'If evidence supports both direct and secondary SC, pursue both',
      'If evidence suggests presumptive condition, consider that pathway',
      'If evidence shows aggravation, consider aggravation theory'
    ]
  }
};

// ============================================================================
// FEDERAL CIRCUIT LANDMARK CASES
// ============================================================================

export const FEDERAL_CIRCUIT_CASES = {
  // Service Connection
  CALUZA: {
    name: 'Caluza v. Brown',
    citation: '7 Vet. App. 498 (1995)',
    holding: 'Established the three elements required for service connection',
    elements: [
      '1. Current disability (medical evidence)',
      '2. In-service incurrence or aggravation (evidence of disease/injury in service)',
      '3. Nexus (medical evidence linking current disability to service)'
    ],
    application: 'The foundational test for ALL service connection claims. If all three Caluza elements are met, service connection should be GRANTED.'
  },

  SHEDDEN: {
    name: 'Shedden v. Principi',
    citation: '381 F.3d 1163 (Fed. Cir. 2004)',
    holding: 'Reaffirmed and clarified the three-element test for service connection',
    elements: [
      '1. Present disability',
      '2. In-service incurrence',
      '3. Causal relationship (nexus) between 1 and 2'
    ]
  },

  WALKER: {
    name: 'Walker v. Shinseki',
    citation: '708 F.3d 1331 (Fed. Cir. 2013)',
    holding: 'Continuity of symptomatology can ONLY be used to establish nexus for conditions listed as "chronic diseases" in 38 CFR § 3.309(a)',
    chronicDiseases: [
      'Arthritis', 'Cardiovascular-renal disease', 'Diabetes mellitus',
      'Epilepsies', 'Hypertension', 'Organic diseases of the nervous system',
      'Psychoses', 'Malignant tumors', 'Tropical diseases', 'Leprosy',
      'Tuberculosis', 'Multiple sclerosis', 'Hansen\'s disease'
    ],
    application: 'If claiming continuity of symptoms, first verify the condition is on the 3.309(a) list. If not, need direct nexus evidence.'
  },

  BUCHANAN: {
    name: 'Buchanan v. Nicholson',
    citation: '451 F.3d 1331 (Fed. Cir. 2006)',
    holding: 'Lay evidence CANNOT be rejected solely because it lacks contemporaneous medical documentation.',
    quotable: '"The Board cannot determine that lay evidence lacks credibility merely because it is unaccompanied by contemporaneous medical evidence."',
    application: 'A gap in medical records does NOT automatically discredit a veteran\'s testimony about continuous symptoms.'
  },

  JANDREAU: {
    name: 'Jandreau v. Nicholson',
    citation: '492 F.3d 1372 (Fed. Cir. 2007)',
    holding: 'Lay witnesses ARE competent to testify about observable symptoms and events.',
    layCompetentFor: [
      'Pain and its severity',
      'Limitation of motion',
      'Observable symptoms (ringing in ears, limping, etc.)',
      'Witnessing events',
      'Continuity of symptoms over time'
    ],
    layNotCompetentFor: [
      'Complex medical diagnoses requiring specialized knowledge',
      'Internal medical processes not externally observable',
      'Causation requiring medical expertise'
    ],
    quotable: '"Lay evidence can be competent and sufficient to establish a diagnosis of a condition when (1) a layperson is competent to identify the medical condition, (2) the layperson is reporting a contemporaneous medical diagnosis, or (3) lay testimony describing symptoms at the time supports a later diagnosis by a medical professional."'
  },

  NIEVES_RODRIGUEZ: {
    name: 'Nieves-Rodriguez v. Peake',
    citation: '22 Vet. App. 295 (2008)',
    holding: 'Medical opinions must contain adequate rationale. Bare conclusions are inadequate.',
    requirements: [
      'Opinion must be supported by adequate rationale',
      'Examiner must be informed of relevant facts',
      'Opinion must address the correct legal standard',
      'Conclusory opinions without explanation are inadequate'
    ],
    application: 'Use this to attack inadequate C&P exams that provide no rationale or ignore favorable evidence.'
  },

  MCLENDON: {
    name: 'McLendon v. Nicholson',
    citation: '20 Vet. App. 79 (2006)',
    holding: 'Established the four-part test for when VA MUST provide a medical examination',
    mclendonTest: [
      '1. Evidence of current disability OR persistent/recurrent symptoms',
      '2. Evidence of in-service event, injury, or disease',
      '3. Indication that disability MAY be associated with service',
      '4. Insufficient medical evidence to make a decision'
    ],
    threshold: 'The "may be associated" threshold is VERY LOW - mere lay assertion of symptoms since service can meet it.',
    application: 'If VA denied without exam and McLendon is met, argue duty to assist violation.'
  },

  // Secondary Service Connection
  ALLEN: {
    name: 'Allen v. Brown',
    citation: '7 Vet. App. 439 (1995)',
    holding: 'Secondary service connection includes conditions AGGRAVATED by service-connected disabilities, not just caused by them.',
    application: 'Even if a condition wasn\'t caused by SC disability, if SC disability makes it WORSE, it can be secondary SC.',
    quotable: '"Any increase in severity of a nonservice-connected disease or injury that is proximately due to or the result of a service-connected disease or injury, and not due to the natural progress of the nonservice-connected disease, will be service connected."'
  },

  // CUE Cases
  RUSSELL: {
    name: 'Russell v. Principi',
    citation: '3 Vet. App. 310 (1992)',
    holding: 'Established the three-part test for Clear and Unmistakable Error (CUE)',
    cueElements: [
      '1. The correct facts, as they were known at the time, were not before the adjudicator',
      '2. The statutory or regulatory provisions existing at the time were incorrectly applied',
      '3. The error must be undebatable - reasonable minds could not differ'
    ],
    manifestlyDifferent: 'The outcome must have been "manifestly different" but for the error.',
    quotable: '"CUE is a very specific and rare kind of error. It is the kind of error, of fact or of law, that when called to the attention of later reviewers compels the conclusion, to which reasonable minds could not differ, that the result would have been manifestly different but for the error."'
  },

  FUGO: {
    name: 'Fugo v. Brown',
    citation: '6 Vet. App. 40 (1993)',
    holding: 'Further clarified CUE requirements',
    keyPoints: [
      'CUE must be based on the record at the time of the decision',
      'A disagreement with how evidence was weighed is NOT CUE',
      'A failure to fulfill duty to assist is NOT CUE (but may be other error)',
      'CUE does not include a change in medical diagnosis'
    ]
  },

  // Effective Dates
  MCGRATH: {
    name: 'McGrath v. Gober',
    citation: '14 Vet. App. 28 (2000)',
    holding: 'Intent to apply for benefits can be inferred from communications to VA',
    application: 'Look for informal claims in ALL correspondence - letters, treatment requests, statements that mention conditions.'
  },

  // Rating Issues
  MITTLEIDER: {
    name: 'Mittleider v. West',
    citation: '11 Vet. App. 181 (1998)',
    holding: 'When it is impossible to separate effects of service-connected and non-service-connected disabilities, ALL symptoms must be attributed to the service-connected condition.',
    application: 'If a veteran has both SC and non-SC conditions with overlapping symptoms, give the veteran the benefit and rate ALL symptoms under the SC condition.'
  }
};

// ============================================================================
// M21-1 ADJUDICATION PROCEDURES MANUAL
// ============================================================================

export const M21_1_REFERENCES = {
  overview: {
    description: 'The M21-1 is VA\'s internal manual for adjudicating claims. Raters MUST follow it.',
    importance: 'Citing M21-1 shows you understand how raters are trained. It carries significant weight.',
    currentVersion: 'M21-1 is continuously updated. Always cite the specific Part and Chapter.'
  },

  KEY_SECTIONS: {
    // Part III - Claims Processing
    PART_III: {
      title: 'General Claims Process',
      relevantChapters: {
        'Chapter 1': 'Claim Receipt and Establishment',
        'Chapter 2': 'Duty to Notify',
        'Chapter 3': 'Duty to Assist',
        'Chapter 4': 'Development',
        'Chapter 5': 'Evidence Evaluation'
      }
    },

    // Part IV - Rating Procedures
    PART_IV: {
      title: 'Rating Procedures',
      relevantChapters: {
        'Subpart i': 'General Rating Information',
        'Subpart ii': 'Body System Examinations',
        'Subpart iii': 'Schedule for Rating Disabilities',
        'Subpart iv': 'Special Topics'
      }
    },

    // Service Connection
    SERVICE_CONNECTION: {
      location: 'M21-1, Part III, Subpart iv, Chapter 4',
      sections: {
        '4.A': 'General Information on Service Connection',
        '4.B': 'Direct Service Connection',
        '4.C': 'Presumptive Service Connection',
        '4.D': 'Secondary Service Connection',
        '4.E': 'Aggravation'
      }
    },

    // Evidence Evaluation
    EVIDENCE_EVALUATION: {
      location: 'M21-1, Part III, Subpart iv, Chapter 5',
      keyGuidance: [
        'How to weigh medical opinions',
        'Competency vs. Credibility of evidence',
        'Probative value assessment',
        'Benefit of the doubt application'
      ]
    },

    // Mental Health
    MENTAL_HEALTH: {
      location: 'M21-1, Part III, Subpart iv, Chapter 4, Section I',
      keyTopics: [
        'PTSD stressor verification',
        'MST claims development',
        'Mental health nexus requirements',
        'Fear of hostile military activity'
      ]
    },

    // Secondary Conditions
    SECONDARY_SC: {
      location: 'M21-1, Part III, Subpart iv, Chapter 4, Section D',
      keyGuidance: [
        'Proximate cause standard',
        'Aggravation vs. causation',
        'Common secondary conditions',
        'Medical nexus requirements for secondary'
      ]
    },

    // Effective Dates
    EFFECTIVE_DATES: {
      location: 'M21-1, Part III, Subpart ii, Chapter 2',
      sections: {
        '2.A': 'General Effective Date Rules',
        '2.B': 'Original Claims',
        '2.C': 'Reopened Claims',
        '2.D': 'Increased Rating Claims',
        '2.E': 'Special Effective Date Rules'
      }
    },

    // CUE
    CUE_PROCEDURES: {
      location: 'M21-1, Part III, Subpart iv, Chapter 7',
      keyGuidance: [
        'CUE motions processing',
        'Error types that qualify as CUE',
        'Revision procedures',
        'Effective date of CUE revision'
      ]
    }
  },

  // Specific M21-1 Quotes for Arguments
  QUOTABLE_SECTIONS: {
    benefitOfDoubt: {
      location: 'M21-1, Part III, Subpart iv, Chapter 5, Section B',
      quote: 'When, after careful consideration of all procurable and assembled data, a reasonable doubt arises regarding service origin... such doubt will be resolved in favor of the claimant.'
    },
    layEvidence: {
      location: 'M21-1, Part III, Subpart iv, Chapter 5, Section D',
      quote: 'Lay evidence is competent if it is provided by a person who has knowledge of facts or circumstances and conveys matters that can be observed and described by a lay person.'
    },
    secondaryConnection: {
      location: 'M21-1, Part III, Subpart iv, Chapter 4, Section D',
      quote: 'A disability which is proximately due to or the result of a service-connected disease or injury shall be service connected.'
    }
  }
};

// ============================================================================
// RATING SCHEDULE KNOWLEDGE (38 CFR Part 4)
// ============================================================================

export const RATING_SCHEDULE = {
  // Mental Disorders - DC 9400-9440
  MENTAL_DISORDERS: {
    diagnosticCodes: '9400-9440',
    regulation: '38 CFR § 4.130',
    generalFormula: {
      100: 'Total occupational and social impairment',
      70: 'Deficiencies in most areas (work, school, family, judgment, thinking, mood)',
      50: 'Reduced reliability and productivity',
      30: 'Occasional decrease in work efficiency',
      10: 'Mild/transient symptoms',
      0: 'Diagnosis but symptoms controlled by medication'
    },
    keySymptoms: {
      100: ['Gross impairment in thought/communication', 'Persistent danger to self/others', 'Disorientation', 'Memory loss for own name/occupation'],
      70: ['Suicidal ideation', 'Obsessional rituals', 'Illogical speech', 'Near-continuous panic/depression', 'Impaired impulse control', 'Neglect of personal hygiene'],
      50: ['Flattened affect', 'Panic attacks >1/week', 'Difficulty understanding complex commands', 'Memory impairment', 'Impaired judgment', 'Disturbances in motivation/mood']
    },
    ptsdSpecific: {
      stressorTypes: ['Combat', 'Fear of hostile activity', 'MST', 'Non-combat'],
      mstMarkers: 'M21-1, Part III, Subpart iv, Chapter 4, Section I.5',
      fearOfHostileActivity: '38 CFR § 3.304(f)(3)'
    }
  },

  // Musculoskeletal - DC 5000-5299
  MUSCULOSKELETAL: {
    diagnosticCodes: '5000-5299',
    regulation: '38 CFR § 4.71a',
    keyPrinciples: {
      painOnMotion: '38 CFR § 4.59 - Painful motion is entitled to at least minimum compensable rating',
      deluca: 'DeLuca v. Brown, 8 Vet. App. 202 (1995) - Must consider functional loss due to pain, weakness, fatigability, incoordination',
      mitchellVShinseki: 'Mitchell v. Shinseki, 25 Vet. App. 32 (2011) - Pain alone without functional loss does not warrant higher rating, BUT 4.59 still applies'
    },
    kneeRatings: {
      5260: 'Limitation of flexion',
      5261: 'Limitation of extension',
      5257: 'Instability/subluxation',
      5258: 'Cartilage, dislocated, with frequent locking/pain/effusion',
      5259: 'Cartilage removal, symptomatic',
      separateRatings: 'Can have BOTH limitation of motion AND instability rated - VAOPGCPREC 23-97'
    },
    backRatings: {
      formula: 'General Rating Formula for Diseases and Injuries of the Spine',
      5235_5243: 'Vertebral fracture through degenerative disc disease',
      ivds: 'Intervertebral Disc Syndrome can be rated under General Formula OR incapacitating episodes, whichever is higher'
    }
  },

  // Sleep Apnea - DC 6847
  SLEEP_APNEA: {
    diagnosticCode: '6847',
    regulation: '38 CFR § 4.97',
    ratings: {
      100: 'Chronic respiratory failure with CO2 retention, cor pulmonale, or tracheostomy',
      50: 'Requires use of CPAP machine',
      30: 'Persistent daytime hypersomnolence',
      0: 'Asymptomatic but with documented sleep disorder'
    },
    secondaryConnections: [
      'Secondary to PTSD/mental health (disrupted sleep architecture)',
      'Secondary to obesity (from physical limitations of SC conditions)',
      'Aggravated by medications for SC conditions'
    ]
  },

  // Tinnitus - DC 6260
  TINNITUS: {
    diagnosticCode: '6260',
    regulation: '38 CFR § 4.87',
    maxRating: '10% - single rating regardless of bilateral',
    secondaryMentalHealth: 'Tinnitus commonly causes/aggravates anxiety, depression, sleep disturbance - pursue secondary mental health'
  },

  // TDIU
  TDIU: {
    regulation: '38 CFR § 4.16',
    schedular: {
      requirement: 'One disability at 60% OR combined 70% with one at 40%',
      standard: 'Unable to secure and follow substantially gainful employment'
    },
    extraschedular: {
      regulation: '38 CFR § 4.16(b)',
      process: 'Referred to Director of Compensation Service when schedular requirements not met but evidence shows unemployability'
    },
    marginalEmployment: 'Earning less than poverty threshold is considered marginal and does not preclude TDIU'
  }
};

// ============================================================================
// SECONDARY SERVICE CONNECTION CHAINS
// ============================================================================

export const SECONDARY_SC_CHAINS = {
  commonChains: [
    {
      primary: 'Bilateral Knee Conditions',
      secondaries: ['Lower back pain (altered gait)', 'Hip conditions (compensatory movement)', 'Plantar fasciitis (gait changes)', 'Obesity (reduced mobility)', 'Depression (chronic pain)']
    },
    {
      primary: 'PTSD/Mental Health',
      secondaries: ['Sleep apnea (disrupted sleep architecture)', 'Hypertension (chronic stress response)', 'GERD (anxiety-related)', 'Bruxism/TMJ (stress clenching)', 'Erectile dysfunction', 'Substance abuse disorders']
    },
    {
      primary: 'Tinnitus',
      secondaries: ['Anxiety (constant noise)', 'Depression (quality of life impact)', 'Sleep disturbance (difficulty falling asleep)', 'Headaches (auditory system strain)']
    },
    {
      primary: 'Lumbar Spine',
      secondaries: ['Radiculopathy (nerve compression)', 'Erectile dysfunction (nerve involvement)', 'Bladder dysfunction', 'Hip conditions (compensatory)', 'Depression (chronic pain)']
    },
    {
      primary: 'Diabetes',
      secondaries: ['Peripheral neuropathy', 'Retinopathy', 'Nephropathy', 'Erectile dysfunction', 'Hypertension', 'Cardiovascular disease']
    },
    {
      primary: 'Sleep Apnea',
      secondaries: ['Hypertension (strain from apnea events)', 'Cardiac conditions', 'Depression/mood disorders', 'Cognitive impairment', 'Nocturia (frequent urination)']
    }
  ],

  regulation: '38 CFR § 3.310(a) - Disabilities that are proximately due to, or aggravated by, service-connected disease or injury',
  allenStandard: 'Per Allen v. Brown, includes conditions AGGRAVATED (made worse) by SC conditions, not just caused by them'
};

// ============================================================================
// CUE ERROR TYPES
// ============================================================================

export const CUE_ERROR_TYPES = {
  categories: [
    {
      type: 'EVIDENCE_OVERLOOKED',
      description: 'VA failed to consider favorable evidence that was in the record',
      examples: ['Ignored positive nexus opinion', 'Failed to consider buddy statements', 'Overlooked service treatment records'],
      legalBasis: 'The correct facts were not before the adjudicator - Russell prong 1'
    },
    {
      type: 'LAW_MISAPPLIED',
      description: 'VA incorrectly applied the law or regulation',
      examples: ['Wrong diagnostic code', 'Failed to apply 38 CFR 3.310 for secondary', 'Applied wrong legal standard for nexus'],
      legalBasis: 'Statutory/regulatory provisions incorrectly applied - Russell prong 2'
    },
    {
      type: 'BENEFIT_OF_DOUBT_FAILURE',
      description: 'VA failed to apply benefit of the doubt when evidence was in equipoise',
      examples: ['Denied despite 50/50 evidence', 'Required more than preponderance against', 'Placed burden on veteran incorrectly'],
      legalBasis: '38 U.S.C. § 5107(b), Gilbert v. Derwinski'
    },
    {
      type: 'INADEQUATE_EXAM',
      description: 'VA relied on inadequate examination',
      examples: ['Examiner provided no rationale', 'Examiner ignored relevant history', 'Examiner unqualified for condition'],
      legalBasis: 'Barr v. Nicholson - once VA provides exam, must be adequate'
    },
    {
      type: 'DUTY_TO_ASSIST_VIOLATION',
      description: 'VA failed in duty to assist (note: may not always qualify as CUE)',
      examples: ['Failed to obtain records', 'Failed to provide exam when McLendon met', 'Failed to notify of missing evidence'],
      legalBasis: '38 U.S.C. § 5103A (but Fugo limits CUE for duty to assist)'
    },
    {
      type: 'THEORY_NOT_CONSIDERED',
      description: 'VA failed to consider all theories of entitlement',
      examples: ['Only considered direct, not secondary', 'Ignored presumptive pathway', 'Failed to consider aggravation'],
      legalBasis: 'Hickson v. West - must consider all theories raised by evidence'
    }
  ]
};

// ============================================================================
// EFFECTIVE DATE RULES
// ============================================================================

export const EFFECTIVE_DATE_RULES = {
  generalRule: {
    regulation: '38 CFR § 3.400',
    rule: 'Effective date is the later of: (1) date of claim, or (2) date entitlement arose',
    exception: 'If claim filed within 1 year of discharge, effective date is day after discharge'
  },

  claimTypes: {
    originalClaim: {
      withinOneYear: 'Day after discharge if claim filed within 1 year',
      afterOneYear: 'Date of receipt of claim'
    },
    increasedRating: {
      regulation: '38 CFR § 3.400(o)(2)',
      rule: 'Up to 1 year prior to claim if facts are ascertainable within that year',
      example: 'If medical evidence shows increase 6 months before claim, effective date is 6 months prior'
    },
    reopenedClaim: {
      rule: 'Date of receipt of claim to reopen OR date entitlement arose, whichever is later',
      cueException: 'If prior denial was CUE, effective date goes back to original claim'
    },
    secondaryCondition: {
      rule: 'Date of claim for secondary OR date disability arose, whichever is later',
      tip: 'Look for medical evidence showing secondary condition existed before formal claim'
    }
  },

  informalClaims: {
    preAMA: {
      regulation: '38 CFR § 3.155 (pre-March 2015)',
      rule: 'Any communication indicating intent to apply for benefits could be informal claim',
      examples: ['Letters to VA mentioning condition', 'Treatment records expressing desire to claim', 'Statements to VA personnel']
    },
    intentToFile: {
      regulation: '38 CFR § 3.155 (current)',
      rule: 'Intent to File (ITF) preserves effective date for 1 year',
      tip: 'Always check for ITF submissions that may predate formal claim'
    }
  },

  liberalizingLaw: {
    regulation: '38 CFR § 3.114',
    rule: 'If new law/regulation is more favorable, effective date can be date of liberalizing change',
    examples: ['Agent Orange presumptives added', 'New conditions added to presumptive lists', 'PACT Act expansions']
  }
};

// ============================================================================
// AGENT KNOWLEDGE INTEGRATION
// ============================================================================

export const AGENT_KNOWLEDGE_PROMPTS = {
  intakeAgent: `
LEGAL KNOWLEDGE FOR INTAKE:
- Review for informal claims in all correspondence (McGrath v. Gober)
- Note any prior VA decisions for CUE analysis
- Flag evidence that may support benefit of the doubt
- Identify potential secondary conditions mentioned
`,

  claimsAgent: `
LEGAL KNOWLEDGE FOR CLAIMS ANALYSIS:
- Apply Caluza/Shedden three-element test for each condition
- Consider ALL theories of entitlement (Hickson v. West)
- For secondary claims, cite 38 CFR § 3.310 and Allen v. Brown
- Assess lay evidence per Jandreau and Buchanan
- Always apply benefit of the doubt (Gilbert v. Derwinski)
`,

  evidenceAgent: `
LEGAL KNOWLEDGE FOR EVIDENCE ANALYSIS:
- Evaluate medical opinions per Nieves-Rodriguez
- Assess lay evidence competency per Jandreau
- Cannot reject lay evidence solely for lack of records (Buchanan)
- For chronic diseases, consider continuity per Walker
- Cite M21-1 evidence evaluation standards
`,

  nexusAgent: `
LEGAL KNOWLEDGE FOR NEXUS OPINIONS:
- Standard: "At least as likely as not" (50% or greater probability)
- Must address Caluza/Shedden elements
- For secondary: show proximate cause OR aggravation (Allen)
- Continuity only for 38 CFR 3.309(a) chronic diseases (Walker)
- Reference M21-1, Part III, Subpart iv, Chapter 4
`,

  qaAgent: `
LEGAL KNOWLEDGE FOR QUALITY REVIEW:
- Verify benefit of the doubt properly applied
- Check all theories of entitlement considered
- Validate nexus meets Nieves-Rodriguez adequacy
- Confirm lay evidence properly weighted (Buchanan)
- Review for CUE in any prior decisions (Russell)
`,

  complianceAgent: `
LEGAL KNOWLEDGE FOR COMPLIANCE:
- 38 CFR Part 3 - Adjudication
- 38 CFR Part 4 - Schedule for Rating Disabilities
- M21-1 Adjudication Procedures Manual
- Duty to Assist requirements (38 U.S.C. § 5103A)
- Privacy Act and HIPAA compliance
`,

  appealsAgent: `
LEGAL KNOWLEDGE FOR APPEALS:
- CUE requirements per Russell v. Principi and Fugo v. Brown
- Effective date rules under 38 CFR § 3.400
- Higher Level Review procedures
- Board appeal options
- Court of Appeals for Veterans Claims standards
`,

  supervisorAgent: `
LEGAL KNOWLEDGE FOR SUPERVISION:
- Ensure all agents apply correct legal standards
- Verify benefit of the doubt threshold met
- Confirm CUE/retro opportunities identified
- Quality control for regulatory compliance
- Coordinate multi-condition claims strategy
`
};

// ============================================================================
// NON-MEDICAL EXPERT QUALIFICATION FRAMEWORK
// ============================================================================

/**
 * Framework establishing qualifications for non-medical evidence analysis
 * Based on M21-1, Federal Circuit precedent, and FRE 702
 *
 * KEY PRINCIPLE: Evidence analysis, documentary review, and compliance
 * assessment do NOT require medical credentials when properly scoped.
 */
export const NON_MEDICAL_EXPERT_QUALIFICATION = {
  legalBasis: {
    m21_1_reference: 'M21-1, Part III, Subpart iv, Chapter 5, Section A - General Information on Examining Evidence',
    federalRules: 'Federal Rules of Evidence 702 - Testimony by Expert Witnesses',
    vaRegulation: '38 CFR § 3.159(a)(1) - Competent lay evidence defined',
    principle: 'Evidence analysis is distinct from medical diagnosis. A qualified analyst may examine, organize, and present documentary evidence without rendering medical opinions.'
  },

  scopeOfExpertise: {
    PERMITTED: [
      'Documentary evidence organization and cataloging',
      'Regulatory compliance analysis (38 CFR, M21-1)',
      'Evidence chain validation and timeline construction',
      'Identification of regulatory pathways (direct, secondary, presumptive)',
      'Recognition of favorable evidence patterns',
      'CUE analysis based on documented procedural errors',
      'Effective date analysis based on regulatory criteria',
      'Cross-referencing evidence with regulatory requirements',
      'Assessment of evidence completeness and gaps',
      'Lay evidence competency determination per Jandreau',
      'Quality review of C&P examination adequacy per Nieves-Rodriguez'
    ],
    NOT_PERMITTED: [
      'Medical diagnosis',
      'Medical causation opinions',
      'Disability rating determinations (these are VA adjudicator decisions)',
      'Treatment recommendations',
      'Prognosis statements'
    ]
  },

  qualificationCriteria: {
    documentaryAnalysis: {
      requirement: 'Demonstrated experience in regulatory compliance, evidence analysis, or federal claims adjudication',
      examples: [
        'Information Systems Security Officer (ISSO) experience',
        'Federal regulatory compliance background',
        'Quality assurance and audit experience',
        'Legal research and analysis training',
        'Evidence management certification'
      ]
    },
    complianceExpertise: {
      requirement: 'Knowledge of applicable regulations and standards',
      domains: [
        '38 CFR Title 38 - Veterans Benefits',
        'M21-1 Adjudication Procedures Manual',
        'NIST 800-53 (for documentation standards)',
        'Federal Records Management',
        'Privacy Act and HIPAA compliance'
      ]
    }
  },

  certificationStatement: {
    standard: `This Evidence Chain Validation was prepared by a qualified non-medical evidence analyst.
The analysis applies documentary review methodology to organize and present existing evidence
for consideration by VA adjudicators. This analysis does NOT constitute medical opinion.

Analyst Qualifications:
- 17+ years Information Systems Security Officer (ISSO) experience
- Federal regulatory compliance expertise
- Evidence analysis and audit methodology training
- No medical opinions are rendered; all medical determinations referenced herein
  are derived from qualified medical sources in the veteran's record.

Per M21-1, Part III, Subpart iv, and Federal Rules of Evidence 702, this analysis
falls within the scope of competent lay evidence presentation and regulatory
compliance assessment, which does not require medical credentials.`,

    disclaimerRequired: true,
    disclaimerText: `NOTICE: This analysis represents documentary review only. All references to
medical conditions, diagnoses, and causation are based on evidence from qualified medical
sources in the veteran's file. The analyst does not render independent medical opinions.
Medical causation determinations must be made by qualified medical professionals.
Legal interpretations should be confirmed by accredited representatives.`
  },

  layEvidenceAnalysis: {
    jandreauStandard: 'Per Jandreau v. Nicholson, 492 F.3d 1372 (Fed. Cir. 2007), lay persons are competent to identify observable symptoms and report contemporaneous diagnoses.',
    buchananStandard: 'Per Buchanan v. Nicholson, 451 F.3d 1331 (Fed. Cir. 2006), lay evidence cannot be rejected solely for lack of contemporaneous medical records.',
    analystRole: 'The analyst identifies and organizes lay evidence, assesses its competency under Jandreau, and presents it alongside medical evidence for adjudicator consideration.'
  },

  evidenceWeightingGuidance: {
    m21_1_standard: 'M21-1, Part III, Subpart iv, Chapter 5, Section B - Evaluating Evidence',
    principles: [
      'Evidence must be weighed, not merely counted',
      'More recent evidence may carry more weight for current condition',
      'Treating physician opinions may carry special weight',
      'Consistency with other evidence enhances credibility',
      'Internal consistency and plausibility assessed'
    ],
    analystApplication: 'The analyst identifies evidence weight factors but does NOT assign final evidentiary weight - that is the adjudicator\'s role.'
  }
};

// ============================================================================
// ANALYST CERTIFICATION BLOCK
// ============================================================================

export const ANALYST_CERTIFICATION = {
  defaultCertification: {
    analyst_name: 'ACE Evidence Analysis Platform',
    analyst_title: 'Non-Medical Evidence Analyst & Compliance Specialist',
    framework: 'ACE Evidence Chain Validation (ECV) Framework',
    credentials: [
      'Information Systems Security Officer (ISSO) - 17+ Years',
      'Federal Regulatory Compliance Expertise',
      'CompTIA Security+ Certified',
      'Evidence Analysis & Audit Methodology Training',
      'NIST 800-53 & FedRAMP Compliance Experience'
    ],
    scope_statement: 'Documentary analysis and regulatory compliance assessment. No medical opinions rendered.',
    signature_line: '/s/ ACE Evidence Analysis Platform',
    methodology: 'Evidence Chain Validation (ECV) - systematic documentary review applying 38 CFR and M21-1 standards'
  },

  legalAuthority: `
This analysis is prepared under the authority and standards of:
- M21-1, Part III, Subpart iv, Chapter 5 - Examining Evidence
- 38 CFR § 3.159(a)(1) - Competent lay evidence standards
- Federal Rules of Evidence 702 - Expert witness qualification
- Jandreau v. Nicholson, 492 F.3d 1372 (Fed. Cir. 2007)
- Buchanan v. Nicholson, 451 F.3d 1331 (Fed. Cir. 2006)

The analyst is qualified to perform documentary review, regulatory compliance
analysis, and evidence organization. Medical determinations are deferred to
qualified medical professionals and VA adjudicators.`
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CORE_PRINCIPLES,
  FEDERAL_CIRCUIT_CASES,
  M21_1_REFERENCES,
  RATING_SCHEDULE,
  SECONDARY_SC_CHAINS,
  CUE_ERROR_TYPES,
  EFFECTIVE_DATE_RULES,
  AGENT_KNOWLEDGE_PROMPTS,
  NON_MEDICAL_EXPERT_QUALIFICATION,
  ANALYST_CERTIFICATION
};
