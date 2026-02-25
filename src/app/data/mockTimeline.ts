/**
 * Mock data simulating a real /analyze/deep response (AnalysisResult).
 * Includes 12 timeline events + 5 rich contradictions for UI development.
 */

import type { AnalysisResultData } from "../components/TimelineView";

export const MOCK_ANALYSIS: AnalysisResultData = {
  //  Phase 1: Timeline 
  document_summary:
    "Bu dava, stanbul merkezli bir inaat irketi olan Gl Yap A.. ile mteahhit Hasan elik arasndaki konut projesi szlemesinden kaynaklanan tazminat uyumazlna ilikindir. Davac, szleme kapsamnda teslim edilmeyen 12 konut bedeli ile gecikme tazminat talep etmektedir. Yarglama sreci 2021 ylnda balam olup Yargtay aamasna tanan dava hl derdesttir.",
  total_events_found: 12,
  primary_jurisdiction: "stanbul 4. Asliye Ticaret Mahkemesi",
  case_number: "2021/1147 E.",
  events: [
    {
      date: "2019-03-15",
      description:
        "Gl Yap A.. ile Hasan elik arasnda 12 adet konut inaat ve teslimi iin 4.800.000 TL bedelli eser szlemesi imzaland.",
      source_page: 2,
      entities: ["Gl Yap A..", "Hasan elik", "Avukat Mert Doan"],
      category: "Szleme / Anlama",
      significance:
        "Davann temel hukuki dayanan oluturan szleme; teslim tarihi, ceza koulu ve deme plann belirlemektedir.",
    },
    {
      date: "2020-09-01",
      description:
        "Szlemede ngrlen konut teslim tarihinin dolmasna karn Hasan elik, 12 konuttan 8'ini teslim etmedi.",
      source_page: 3,
      entities: ["Hasan elik", "Gl Yap A.."],
      category: "Olay An",
      significance:
        "Teslim ykmllnn ihlali, szlemedeki gnlk 5.000 TL gecikme cezasn tetiklemi ve dava hakkn dourmutur.",
    },
    {
      date: "2020-10-22",
      description:
        "Gl Yap A.. vekili Avukat Mert Doan, Hasan elik'e noter araclyla ihtarname gndererek 30 gn iinde teslim veya bedel iadesini talep etti.",
      source_page: 4,
      entities: ["Gl Yap A..", "Avukat Mert Doan", "Hasan elik", "Beyolu 3. Noteri"],
      category: "Tebligat / Bildirim",
      significance:
        "htarname, dava almas iin aranan n koul niteliinde olup temerrt tarihini kesin olarak belirlemitir.",
    },
    {
      date: "2020-11-30",
      description:
        "htarnameye sresi iinde yant verilmemesi zerine Gl Yap A.. tarafndan stanbul 4. Asliye Ticaret Mahkemesi'nde tazminat davas ald. Dava dilekesinde 3.200.000 TL asl alacak ve 427.000 TL gecikme tazminat talep edildi.",
      source_page: 5,
      entities: [
        "Gl Yap A..",
        "Hasan elik",
        "stanbul 4. Asliye Ticaret Mahkemesi",
        "Avukat Mert Doan",
      ],
      category: "Dileke / Bavuru",
      significance:
        "Dava dilekesinde 3.200.000 TL asl alacak ile 427.000 TL gecikme tazminat talep edilmitir.",
    },
    {
      date: "2021-02-10",
      description:
        "Daval Hasan elik vekili, cevap dilekesi sunarak szlemenin tamamen ifa edildiini ve gecikmenin COVID-19 pandemisinden kaynaklanan mcbir sebepten kaynaklandn ileri srd.",
      source_page: 6,
      entities: ["Hasan elik", "Avukat Selin Yldz", "stanbul 4. Asliye Ticaret Mahkemesi"],
      category: "Dileke / Bavuru",
      significance:
        "Mcbir sebep savunmas, ispat ykn davalya yklemi ve bilirkii incelemesini zorunlu klmtr.",
    },
    {
      date: "2021-05-18",
      description:
        "lk duruma gerekletirildi; mahkeme inaat mhendisi ve inaat hukuku uzmanndan oluan  kiilik bilirkii heyeti atad.",
      source_page: 8,
      entities: [
        "Hkim Elif Arslan",
        "Gl Yap A..",
        "Hasan elik",
        "stanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Mahkeme lemi",
      significance: null,
    },
    {
      date: "2021-10-04",
      description:
        "naat mhendisi Ahmet Kl, durumada tank sfatyla ifade vererek konutlarn yalnzca %40 orannda tamamlandn, teslim edilenlerin ise szleme artnamesine aykrlklar ierdiini beyan etti.",
      source_page: 10,
      entities: [
        "naat Mhendisi Ahmet Kl",
        "Gl Yap A..",
        "Hasan elik",
        "stanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Tank fadesi",
      significance:
        "Uzman tank ifadesi, davalnn mcbir sebep savunmasn rtm ve mahkemenin ara kararn dorudan etkilemitir.",
    },
    {
      date: "2022-01-27",
      description:
        "Bilirkii kurulu raporunu mahkemeye sundu. Rapora gre tamamlanmayan konutlarn piyasa deeri 2.950.000 TL; gecikme tazminat ise 380.000 TL olarak hesapland.",
      source_page: 12,
      entities: [
        "Bilirkii Prof. Dr. Cihan zdemir",
        "Bilirkii Mh. Leyla Sar",
        "stanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Mahkeme lemi",
      significance:
        "Bilirkii raporu, mahkemenin hkm iin esas ald asl delil niteliindedir.",
    },
    {
      date: "2022-06-15",
      description:
        "stanbul 4. Asliye Ticaret Mahkemesi, bilirkii raporunu esas alarak daval Hasan elik'in davacya 2.950.000 TL asl alacak + 380.000 TL gecikme tazminat + yarglama giderleri demesine hkmetti.",
      source_page: 15,
      entities: [
        "Hkim Elif Arslan",
        "Gl Yap A..",
        "Hasan elik",
        "stanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Karar / Hkm",
      significance:
        "Davac lehine kan nihai karar, toplam 3.330.000 TL deme ykmll dourmutur. Daval temyiz yoluna bavurmutur.",
    },
    {
      date: "2022-08-03",
      description:
        "Daval Hasan elik vekili, ilk derece mahkemesi kararna itiraz ederek Yargtay 15. Hukuk Dairesi'ne temyiz bavurusunda bulundu.",
      source_page: 16,
      entities: ["Hasan elik", "Avukat Selin Yldz", "Yargtay 15. Hukuk Dairesi"],
      category: "Dileke / Bavuru",
      significance:
        "Temyiz bavurusu, kararn icraya konulmasn geici olarak durduran icra takibinin askya alnmasna yol amtr.",
    },
    {
      date: "2022-09-20",
      description:
        "Gl Yap A.. kararn kesinlemesini beklemeksizin Hasan elik aleyhine stanbul Anadolu cra Dairesi'nde ihtiyati haciz karar uygulamas balatt.",
      source_page: 17,
      entities: [
        "Gl Yap A..",
        "Avukat Mert Doan",
        "stanbul Anadolu 12. cra Mdrl",
        "Hasan elik",
      ],
      category: "cra Takibi",
      significance:
        "htiyati haciz, davalnn stanbul'daki iki tanmaznn tapu kaydna ilenmitir.",
    },
    {
      date: "2023-11-14",
      description:
        "Yargtay 15. Hukuk Dairesi, ilk derece mahkemesinin kararn onad; bilirkii hesabnda usul ve esas ynnden herhangi bir hata bulunmad tespit edildi.",
      source_page: 20,
      entities: ["Yargtay 15. Hukuk Dairesi", "Gl Yap A..", "Hasan elik"],
      category: "Karar / Hkm",
      significance:
        "Yargtay onay ile karar kesinlemi; ihtiyati haciz icra haczine dnm ve tahsilat sreci balamtr.",
    },
  ],

  //  Phase 2: Contradiction Analysis 
  total_contradictions_found: 5,
  risk_level: "HIGH",
  analysis_notes:
    "Belge, zellikle davalnn savunmalar ile maddi olgular arasnda ciddi i tutarszlklar barndrmaktadr. Tank ifadesi ve bilirkii raporu daval aleyhine gl delil olutururken, gecikme tazminat hesabndaki tutarszlk ve teslim edildii iddia edilen konut saysndaki belirsizlik davac tarafn da zayf noktalarn oluturmaktadr.",
  contradictions: [
    {
      title: "Szleme fas ddias ile Tank Beyan elikisi",
      contradiction_type: "WITNESS_CONFLICT",
      description:
        "Olay #4 (2021-02-10): Hasan elik'in vekili cevap dilekesinde szlemenin 'tamamen ifa edildiini' aka beyan etmektedir. Ancak Olay #6 (2021-10-04): Uzman tank naat Mhendisi Ahmet Kl, mahkemede yemin altnda verdii ifadede konutlarn yalnzca %40 orannda tamamlandn ve teslim edilenlerin artname uyumsuzluu ierdiini belirtmitir. Bu iki beyan birbirleriyle dorudan elimektedir. Hukuki sonu: Davalnn szleme ifas savunmas, uzman tank ifadesiyle rtlm olup bu eliki mahkemenin daval lehine karar vermesini neredeyse imknsz klmaktadr.",
      involved_event_ids: [4, 6],
      severity: "HIGH",
      confidence_score: 0.97,
      legal_basis:
        "elikili Beyan (Contradictio in Terminis)  HMK m.200 Senetle spat; TBK m.112 Borcun fa Edilmemesi",
      recommended_action:
        "Tank Ahmet Kl'n mahkeme tutanan ve imzal raporunu davalnn cevap dilekesiyle birlikte Yargtay dosyasna ekleyin. Davalnn 'tam ifa' iddiasn destekleyen herhangi bir yazl belge olup olmadn aratrn.",
    },
    {
      title: "Gecikme Tazminat Miktarnda Rakam Uyumsuzluu",
      contradiction_type: "FACTUAL_ERROR",
      description:
        "Olay #3 (2020-11-30): Dava dilekesinde davac tarafndan talep edilen gecikme tazminat 427.000 TL olarak belirtilmektedir. Olay #7 (2022-01-27): Mahkeme tarafndan atanan bamsz bilirkii heyeti, gecikme tazminatn 380.000 TL olarak hesaplamtr. Bu 47.000 TL'lik (~%11) fark aklanmamtr. Hukuki sonu: Talep edilen miktar ile bilirkii hesab arasndaki fark, mahkemenin talep am gerekesiyle fazla talebi reddetmesine neden olmu; bu durum yarglama giderlerinin hesabn etkileyebilir.",
      involved_event_ids: [3, 7],
      severity: "HIGH",
      confidence_score: 0.93,
      legal_basis:
        "HMK m.26 Taleple Ballk (Ultra Petita Yasa)  Mahkeme talep edilen miktar aan karar veremez",
      recommended_action:
        "Gecikme tazminatnn nasl hesaplandn netletirin: Orijinal 427.000 TL hesabnn dayanan (gnlk 5.000 TL  gn says) belgeleyin ve bilirkii raporundaki 380.000 TL hesabyla kyaslayn. Farkn kaynan tespit edin.",
    },
    {
      title: "Mcbir Sebep Savunmas ile Szleme Tarihinin elikisi",
      contradiction_type: "WITNESS_CONFLICT",
      description:
        "Olay #4 (2021-02-10): Daval Hasan elik'in vekili, inaat gecikmesinin COVID-19 pandemisinden kaynaklanan mcbir sebepten ileri geldiini savunmutur. Ancak Olay #0 (2019-03-15): Szleme, pandemi balamadan yaklak 12 ay nce (Mart 2019) imzalanmtr ve teslim tarihi Eyll 2020 olarak belirlenmitir. Pandemi Mart 2020'de Trkiye'yi etkilemeye balamtr; dolaysyla teslim tarihine yalnzca 6 ay kalmken balayan pandemi tek bana mcbir sebep oluturabilirdi. Ancak daval, bu sre zarfnda mahkemeye herhangi bir ek sre uzatma talebi sunmam ya da szleme deiiklii bavurusunda bulunmamtr.",
      involved_event_ids: [0, 4],
      severity: "MEDIUM",
      confidence_score: 0.81,
      legal_basis:
        "TBK m.136 fa mknszl (Mcbir Sebep)  Mcbir sebebin szleme yaplrken ngrlememesi ve kanlmaz olmas gerekir",
      recommended_action:
        "Davalnn Mart-Eyll 2020 dnemine ait inaat ilerleme raporlarn, antiye kaytlarn ve olas pandemi tedbir bavurularn talep edin. Szlemede ngrlemez olay (force majeure) maddesi var m aratrn.",
    },
    {
      title: "htarname Sresi Dolmadan Dava Almas",
      contradiction_type: "TIMELINE_IMPOSSIBILITY",
      description:
        "Olay #2 (2020-10-22): htarnamede davalya 'teslim veya bedel iadesi iin 30 gn sre' verilmitir. Bu sre 2020-11-21'de dolmaktadr. Olay #3 (2020-11-30): Dava, ihtarnamenin tebliinden yalnzca 39 gn sonra almtr (2020-11-30). htarname 22 Ekim 2020'de gnderilmi ve tebli tarihi belirsizdir. Eer tebli 22 Ekim'den sonraki bir tarihte gereklemise (rnein 25 Ekim), 30 gnlk sre 24 Kasm'a kadar uzayacak ve dava, sre dolmadan alm olacaktr. Bu usul hatas davann reddi riskini dourabilir.",
      involved_event_ids: [2, 3],
      severity: "MEDIUM",
      confidence_score: 0.74,
      legal_basis:
        "HMK m.317  htarname tebli tarihi ve ihtarl srenin hesab; noter tebliine ilikin Noterlik Kanunu m.98",
      recommended_action:
        "htarnamenin noter tebli makbuzunu ve davalya ulama tarihini acilen temin edin. Tebli tarihi 22 Ekim'den sonraysa dava dilekesinin usul ynnden incelenmesi gerekmektedir.",
    },
    {
      title: "Szlemedeki 12 Konuttan Yalnzca 8'inin Aklanmas",
      contradiction_type: "MISSING_INFO",
      description:
        "Olay #0 (2019-03-15): Eser szlemesi 12 adet konutun inaatn ve teslimini kapsamaktadr. Olay #1 (2020-09-01): Teslim tarihi ihlalinde 'Hasan elik, 12 konuttan 8'ini teslim etmedi' ifadesi kullanlmaktadr. Bu ifade, 4 konutun teslim edildiini ima etmektedir. Ancak belgenin hibir yerinde: (a) Teslim edildii ima edilen 4 konutun hangileri olduu, (b) Bu 4 konutun kabul/red durumu, (c) Bu 4 konutun bedelinin denip denmedii aklanmamaktadr. Bilirkii raporu da yalnzca 'tamamlanmayan konutlar' zerinden hesap yapm; teslim edilen konutlarn deeri tartlmamtr.",
      involved_event_ids: [0, 1, 7],
      severity: "LOW",
      confidence_score: 0.88,
      legal_basis:
        "TBK m.473  Eser Szlemesinde Ksmi fa; HMK m.190 spat Yk",
      recommended_action:
        "Teslim edildii iddia edilen 4 konutun teslimine ilikin tutanaklar ve kabul belgelerini dosyaya kazandrn. Bu bilgi bilirkii hesabn ve talep edilen miktar dorudan etkileyebilir.",
    },
  ],
};
