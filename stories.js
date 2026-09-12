// Editorial content layer — stories, mechanism prose, featured curation.
// Kept separate from catalog data so it can evolve independently.

window.PEPTICORE_STORIES = {

  // Per-category editorial brief for the "Field guide" section on home
  // and for the kicker paragraph on each category page.
  categories: {
    "glp1": {
      kicker: "Chapter I",
      lede: "GLP-1, amylin, and incretin-based research.",
      prose: "A focused metabolic-research catalog covering GLP-1 receptor agonists, amylin analogs, and dual / triple agonist series. Each entry is organized by SKU, vial count, and vial-format specification for straightforward protocol planning.",
      mechanism: "This category supports incretin signaling, glucose-handling, and metabolic model research. Product pages include matched primary literature where available, with class references used for context only.",
      references: [
        { source: "New England Journal of Medicine", title: "Tirzepatide incretin-pathway research study", year: "2022", ref: "PMID 35658024 · DOI 10.1056/NEJMoa2206038", authors: "Jastreboff AM, Aronne LJ, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/35658024/", series: ["tirzepatide", "rt-tr-combo"] },
        { source: "New England Journal of Medicine", title: "Semaglutide metabolic-research study", year: "2021", ref: "PMID 33567185 · DOI 10.1056/NEJMoa2032183", authors: "Wilding JPH, Batterham RL, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/33567185/", series: ["semaglutide", "cagrisema"] },
        { source: "JAMA", title: "Tirzepatide metabolic-model research study", year: "2024", ref: "PMID 38819983 · DOI 10.1001/jama.2024.9217", authors: "Zhao L, Cheng Z, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/38819983/", series: ["tirzepatide", "rt-tr-combo"] },
        { source: "New England Journal of Medicine", title: "Retatrutide triple-receptor research study", year: "2023", ref: "PMID 37366315 · DOI 10.1056/NEJMoa2301972", authors: "Jastreboff AM, Kaplan LM, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/37366315/", series: ["retatrutide", "rt-tr-combo"] }
      ]
    },
    "gh-igf": {
      kicker: "Chapter II",
      lede: "Growth hormone and IGF-axis research.",
      prose: "Somatotropic-axis compounds including HGH, CJC analogs, GHRPs, secretagogues, IGF-1 LR3, MGF, and related combinations. The category is arranged for comparison across single compounds and paired protocols.",
      mechanism: "These series are used in research models involving GH pulsatility, IGF signaling, tissue-growth pathways, and endocrine feedback. Literature links are provided for research context, not product claims.",
      references: [
        { source: "Journal of Clinical Endocrinology & Metabolism", title: "CJC-1295 GH and IGF-I signaling research study", year: "2006", ref: "PMID 16352683 · DOI 10.1210/jc.2005-1536", authors: "Teichman SL, Neale A, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/16352683/", series: ["cjc-dac", "cjc-nodac", "cjc-ipa", "sermorelin", "tesamorelin"] },
        { source: "Journal of Clinical Endocrinology & Metabolism", title: "Pulsatile GH secretion persists during continuous CJC-1295 stimulation", year: "2006", ref: "PMID 17018654 · DOI 10.1210/jc.2006-1702", authors: "Ionescu M, Frohman LA", url: "https://pubmed.ncbi.nlm.nih.gov/17018654/", series: ["cjc-dac", "cjc-nodac", "cjc-ipa", "hgh", "igf1-lr3"] },
        { source: "European Journal of Endocrinology", title: "Ipamorelin, the first selective growth hormone secretagogue", year: "1998", ref: "PMID 9849822 · DOI 10.1530/eje.0.1390552", authors: "Raun K, Hansen BS, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/9849822/", series: ["ipamorelin", "ghrp2", "ghrp6", "hexarelin"] },
        { source: "Pharmaceutical Research", title: "PK/PD modeling of ipamorelin research data", year: "1999", ref: "PMID 10496658 · DOI 10.1023/a:1018955126402", authors: "Gobburu JV, Agerso H, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/10496658/", series: ["ipamorelin", "ghrp2", "ghrp6", "hexarelin"] }
      ]
    },
    "healing": {
      kicker: "Chapter III",
      lede: "Matrix and tissue-response models.",
      prose: "BPC-157, TB-500, GHK-CU, and related tissue-response model peptides, including common combination formats. Specifications are presented as research-use vials with clear specification ladders and pack formats.",
      mechanism: "This section focuses on angiogenesis, fibroblast behavior, extracellular-matrix remodeling, and inflammatory-signaling models. Combination products are listed separately to keep protocols easy to compare.",
      references: [
        { source: "Journal of Applied Physiology", title: "BPC 157 tissue-model signaling research", year: "2011", ref: "PMID 21030672 · DOI 10.1152/japplphysiol.00945.2010", authors: "Chang CH, Tsai WC, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/21030672/", series: ["bpc157", "bpc-tb-combo", "glow", "klow"] },
        { source: "Journal of Physiology and Pharmacology", title: "BPC 157 angiogenesis-model research", year: "2009", ref: "PMID 20388964", authors: "Brcic L, Brcic I, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/20388964/", series: ["bpc157", "bpc-tb-combo", "glow", "klow"] },
        { source: "Journal of Cellular Physiology", title: "Thymosin beta4 matrix-response research", year: "2006", ref: "PMID 16607611 · DOI 10.1002/jcp.20650", authors: "Philp D, Scheremeta B, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/16607611/", series: ["tb500", "tb-frag", "bpc-tb-combo", "glow"] },
        { source: "International Journal of Molecular Sciences", title: "GHK-CU peptide signaling research review", year: "2018", ref: "PMID 29986520 · DOI 10.3390/ijms19071987", authors: "Pickart L, Margolina A", url: "https://pubmed.ncbi.nlm.nih.gov/29986520/", series: ["ghk-cu", "glow", "klow"] }
      ]
    },
    "longevity": {
      kicker: "Chapter IV",
      lede: "Mitochondrial, senescence, and redox research.",
      prose: "A catalog of longevity-oriented research compounds including NAD+, SS-31, FOX04-DRI, Epithalon, glutathione, and organ-specific bioregulator peptides. Entries are grouped by pathway and specification.",
      mechanism: "This category covers telomere biology, mitochondrial membrane studies, senescence models, NAD+ salvage, and redox balance. Product descriptions stay focused on research context and documentation.",
      references: [
        { source: "Cell", title: "Targeted apoptosis of senescent cells restores tissue homeostasis", year: "2017", ref: "PMID 28340339 · DOI 10.1016/j.cell.2017.02.031", authors: "Baar MP, Brandt RMC, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/28340339/", series: ["fox04-dri", "p21"] },
        { source: "Trends in Molecular Medicine", title: "NAD+ molecular-mechanism research review", year: "2017", ref: "PMID 28899755 · DOI 10.1016/j.molmed.2017.08.001", authors: "Fang EF, Lautrup S, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/28899755/", series: ["nad", "glutathione", "aicar"] },
        { source: "Journal of the American Society of Nephrology", title: "SS-31 re-energizes ischemic mitochondria by interacting with cardiolipin", year: "2013", ref: "PMID 23813215 · DOI 10.1681/ASN.2012121216", authors: "Birk AV, Liu S, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/23813215/", series: ["ss31"] },
        { source: "Metabolism", title: "Regulation of NAD+ metabolism research review", year: "2022", ref: "PMID 34743990 · DOI 10.1016/j.metabol.2021.154923", authors: "Chu X, Raju RP", url: "https://pubmed.ncbi.nlm.nih.gov/34743990/", series: ["nad", "glutathione", "aicar"] }
      ]
    },
    "cognitive": {
      kicker: "Chapter V",
      lede: "Neurotrophic and neuromodulatory research.",
      prose: "Semax, Selank, Cerebrolysin, Melatonin, PE-22-28, and related peptides for cognitive, stress-response, sleep, and neural-function models. Each series is listed with a compact specification table.",
      mechanism: "These compounds are commonly discussed in research around neurotrophic signaling, GABAergic tone, sleep architecture, and synaptic plasticity. References are provided for scientific context.",
      references: [
        { source: "Journal of Neurochemistry", title: "Semax binds specifically and increases BDNF in rat basal forebrain", year: "2006", ref: "PMID 16635254 · DOI 10.1111/j.1471-4159.2006.03658.x", authors: "Dolotov OV, Karpenko EA, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/16635254/", series: ["semax"] },
        { source: "Protein and Peptide Letters", title: "Peptide-based anxiolytics: molecular aspects of Selank activity", year: "2018", ref: "PMID 30255741 · DOI 10.2174/0929866525666180925144642", authors: "Vyunova TV, Andreeva L, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/30255741/", series: ["selank"] },
        { source: "Journal of Neural Transmission", title: "Cerebrolysin neural-function research review", year: "2007", ref: "PMID 17318304 · DOI 10.1007/s00702-007-0630-y", authors: "Wei ZH, He QB, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/17318304/", series: ["cerebrolysin"] },
        { source: "Sleep Medicine Reviews", title: "Melatonin sleep-architecture research review", year: "2022", ref: "PMID 36179487 · DOI 10.1016/j.smrv.2022.101692", authors: "Choi K, Lee YJ, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/36179487/", series: ["melatonin"] }
      ]
    },
    "sexual-hormonal": {
      kicker: "Chapter VI",
      lede: "Endocrine and reproductive-axis research.",
      prose: "Kisspeptin, gonadorelin, HCG, HMG, PT-141, melanotan series, oxytocin, and related compounds for hormonal-axis and reproductive-system models.",
      mechanism: "This category focuses on HPG-axis signaling, GnRH pulse models, gonadotropin pathways, melanocortin research, and oxytocin-related signaling.",
      references: [
        { source: "Journal of Neuroendocrinology", title: "Gonadotrophin-releasing hormone and kisspeptin: It takes two to tango", year: "2021", ref: "PMID 34533248 · DOI 10.1111/jne.13037", authors: "Duittoz A, Cayla X, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/34533248/", series: ["kisspeptin10", "gonadorelin", "hcg", "hmg"] },
        { source: "Journal of Neuroscience", title: "Kisspeptin depolarizes GnRH neurons through TRPC-like cationic channels", year: "2008", ref: "PMID 18434521 · DOI 10.1523/JNEUROSCI.5352-07.2008", authors: "Zhang C, Roepke TA, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/18434521/", series: ["kisspeptin10", "gonadorelin"] },
        { source: "Women's Health", title: "Bremelanotide melanocortin-pathway research study", year: "2016", ref: "PMID 27181790 · DOI 10.2217/whe-2016-0018", authors: "Clayton AH, Althof SE, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/27181790/", series: ["pt141", "mt1", "mt2"] },
        { source: "Obstetrics & Gynecology", title: "Bremelanotide signaling research study", year: "2019", ref: "PMID 31599847 · DOI 10.1097/AOG.0000000000003514", authors: "Simon JA, Kingsberg SA, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/31599847/", series: ["pt141"] }
      ]
    },
    "skin-beauty": {
      kicker: "Chapter VII",
      lede: "Dermal, aesthetic, and adipocyte-model research.",
      prose: "Botulinum toxin, Snap-8, Lipo-C, L-Carnitine, MIC, and adjacent cosmetic-research compounds. Product cards separate single compounds from combination formats.",
      mechanism: "This section covers neuromuscular-junction models, SNARE-complex research, lipotropic formulations, and adipocyte / dermal-cell study contexts.",
      references: [
        { source: "Journal of Neurochemistry", title: "Proteolysis of SNAP-25 isoforms by botulinum neurotoxin types A, C, and E", year: "1999", ref: "PMID 9886085 · DOI 10.1046/j.1471-4159.1999.0720327.x", authors: "Vaidyanathan VV, Yoshino K, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/9886085/", series: ["botulinum"] },
        { source: "Journal of Biological Chemistry", title: "BoNT/A light chain association with plasma membrane-bound SNAP-25", year: "2011", ref: "PMID 21378164 · DOI 10.1074/jbc.M111.224493", authors: "Chen S, Barbieri JT", url: "https://pubmed.ncbi.nlm.nih.gov/21378164/", series: ["botulinum", "snap8"] },
        { source: "Cutaneous and Ocular Toxicology", title: "In vitro skin penetration of acetyl hexapeptide-8 from a cosmetic formulation", year: "2015", ref: "PMID 24754410 · DOI 10.3109/15569527.2014.894521", authors: "Kraeling ME, Zhou W, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/24754410/", series: ["snap8"] },
        { source: "International Journal of Cosmetic Science", title: "The effect of synthetic acetylhexapeptide-8 on sebaceous function", year: "2022", ref: "PMID 35690997 · DOI 10.1111/ics.12795", authors: "Shi VY, Burney W, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/35690997/", series: ["snap8"] }
      ]
    },
    "solvents": {
      kicker: "Chapter VIII",
      lede: "Reconstitution and lab-use essentials.",
      prose: "Bacteriostatic water, acetic-acid water, benzyl alcohol, and B12 support products for reconstitution, handling, and routine laboratory preparation.",
      mechanism: "Solvents and accessories are listed to support research-use vial handling. Storage notes are informational and should be checked against local laboratory protocols.",
      references: [
        { source: "DailyMed / National Library of Medicine", title: "Bacteriostatic water label reference", year: "2025", ref: "NDA 018802 · official label reference", authors: "NLM DailyMed label", url: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=42c6938e-f747-ae13-e063-6294a90a59a3", series: ["bac-water", "benzyl-alcohol"] },
        { source: "Journal of Pharmaceutical Sciences", title: "Antimicrobial preservative use in parenteral products: past and present", year: "2007", ref: "PMID 17722087 · DOI 10.1002/jps.20976", authors: "Meyer BK, Ni A, et al.", url: "https://pubmed.ncbi.nlm.nih.gov/17722087/", series: ["bac-water", "benzyl-alcohol"] },
        { source: "The Joint Commission", title: "Multi-dose vial handling reference", year: "2024", ref: "Handling FAQ", authors: "The Joint Commission", url: "https://www.jointcommission.org/standards/standard-faqs/ambulatory/medication-management-mm/000001529/", series: ["bac-water", "aa-water", "benzyl-alcohol", "b12"] }
      ]
    }
  },

  seriesReferences: {
    strategy: "references[].series"
  },

  // Hand-picked features for the magazine strip on home
  featured: [
    { catId: "glp1", seriesId: "retatrutide",
      kicker: "High demand",
      lede: "Triple-agonist research series.",
      body: "A nine-option specification ladder with matched metabolic-research references and clear SKU progression." },
    { catId: "glp1", seriesId: "tirzepatide",
      kicker: "Core catalog",
      lede: "Dual-agonist research series.",
      body: "Twelve listed vial-format options with distinct SKU references and matched literature context on the product page." },
    { catId: "healing", seriesId: "bpc157",
      kicker: "Repair models",
      lede: "Single compound and combination formats.",
      body: "A commonly requested repair-model peptide, available alone or paired with TB-500 and GHK-CU in combination entries." }
  ]
};
