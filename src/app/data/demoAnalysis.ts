import type { AnalysisResultData } from "../components/TimelineView";

export const DEMO_ANALYSIS: AnalysisResultData = {
  document_summary:
    "Bu örnek dosya, inşaat sözleşmesinden doğan gecikme ve eksik teslim uyuşmazlığını içeren kurgusal bir ticari davayı temsil eder. Olaylar sözleşme imzasından Yargıtay onamasına kadar kronolojik olarak sıralanmıştır.",
  total_events_found: 10,
  primary_jurisdiction: "İstanbul 4. Asliye Ticaret Mahkemesi",
  case_number: "2021/1147 E.",
  events: [
    {
      date: "2019-03-15",
      description:
        "Gül Yapı A.Ş. ile Hasan Çelik arasında 12 dairelik proje için eser sözleşmesi imzalandı.",
      source_page: 2,
      entities: ["Gül Yapı A.Ş.", "Hasan Çelik"],
      category: "Sözleşme / Anlaşma",
      significance: "Uyuşmazlığın temel hukuki dayanağıdır.",
    },
    {
      date: "2020-09-01",
      description:
        "Sözleşmedeki teslim tarihi geçti; 12 dairenin 8’i teslim edilmedi.",
      source_page: 3,
      entities: ["Gül Yapı A.Ş.", "Hasan Çelik"],
      category: "Olay Anı",
      significance: "Temerrüt ve gecikme tazminatı hesabını tetikler.",
    },
    {
      date: "2020-10-22",
      description:
        "Davacı taraf noter ihtarnamesi göndererek 30 gün içinde teslim veya bedel iadesi talep etti.",
      source_page: 4,
      entities: ["Gül Yapı A.Ş.", "Hasan Çelik", "Beyoğlu 3. Noterliği"],
      category: "Tebligat / Bildirim",
      significance: "Temerrüt tarihinin belirlenmesi açısından kritiktir.",
    },
    {
      date: "2020-11-30",
      description:
        "İhtar sonrası sonuç alınamayınca tazminat davası açıldı ve 3.200.000 TL asıl alacak talep edildi.",
      source_page: 5,
      entities: ["Gül Yapı A.Ş.", "Hasan Çelik", "İstanbul 4. Asliye Ticaret Mahkemesi"],
      category: "Dilekçe / Başvuru",
      significance: "Yargılama sürecini başlatır.",
    },
    {
      date: "2021-02-10",
      description:
        "Davalı, sözleşmenin ifa edildiğini ve gecikmenin mücbir sebepten kaynaklandığını savundu.",
      source_page: 6,
      entities: ["Hasan Çelik", "Av. Selin Yıldız"],
      category: "Dilekçe / Başvuru",
      significance: "İspat yükünü etkileyen ana savunmadır.",
    },
    {
      date: "2021-10-04",
      description:
        "Uzman tanık, inşaatın yalnızca %40 seviyesinde tamamlandığını beyan etti.",
      source_page: 10,
      entities: ["İnşaat Müh. Ahmet Kılıç", "İstanbul 4. Asliye Ticaret Mahkemesi"],
      category: "Tanık İfadesi",
      significance: "Davalı savunması ile çelişen güçlü delildir.",
    },
    {
      date: "2022-01-27",
      description:
        "Bilirkişi raporu, tamamlanmayan bağımsız bölümler için 2.950.000 TL zarar hesabı yaptı.",
      source_page: 12,
      entities: ["Bilirkişi Heyeti", "İstanbul 4. Asliye Ticaret Mahkemesi"],
      category: "Mahkeme İşlemi",
      significance: "Kararda esas alınan teknik delildir.",
    },
    {
      date: "2022-06-15",
      description:
        "Mahkeme davayı kabul ederek davalı aleyhine 2.950.000 TL alacak ve 380.000 TL gecikme tazminatına hükmetti.",
      source_page: 15,
      entities: ["Hakim Elif Arslan", "Gül Yapı A.Ş.", "Hasan Çelik"],
      category: "Karar / Hüküm",
      significance: "İlk derece kararının parasal sonucunu belirler.",
    },
    {
      date: "2022-08-03",
      description:
        "Davalı vekili Yargıtay 15. Hukuk Dairesi nezdinde temyiz başvurusu yaptı.",
      source_page: 16,
      entities: ["Hasan Çelik", "Av. Selin Yıldız", "Yargıtay 15. Hukuk Dairesi"],
      category: "Dilekçe / Başvuru",
      significance: "Kararın kesinleşmesini geciktirir.",
    },
    {
      date: "2023-11-14",
      description:
        "Yargıtay ilk derece kararını onadı; karar kesinleşti.",
      source_page: 20,
      entities: ["Yargıtay 15. Hukuk Dairesi", "Gül Yapı A.Ş.", "Hasan Çelik"],
      category: "Karar / Hüküm",
      significance: "İcra ve tahsilat aşamasına geçiş sağlar.",
    },
  ],
  contradictions: [
    {
      title: "Tam ifa savunması ile tanık beyanı çelişkisi",
      contradiction_type: "WITNESS_CONFLICT",
      description:
        "Davalı tam ifa savunması yaparken uzman tanık inşaat seviyesinin %40 olduğunu belirtmiştir.",
      involved_event_ids: [4, 5],
      severity: "HIGH",
      confidence_score: 0.96,
      legal_basis: "HMK m.198 ve TBK m.112 kapsamında delil değerlendirmesi",
      recommended_action:
        "Tanık tutanağı ile savunma dilekçesini birlikte sunarak çelişkiyi vurgulayın.",
    },
    {
      title: "Talep edilen ve hesaplanan gecikme tazminatı farkı",
      contradiction_type: "FACTUAL_ERROR",
      description:
        "Dilekçedeki tazminat kalemi ile bilirkişi hesabı arasında miktar farkı bulunmaktadır.",
      involved_event_ids: [3, 6],
      severity: "MEDIUM",
      confidence_score: 0.88,
      legal_basis: "HMK m.26 taleple bağlılık ilkesi",
      recommended_action:
        "Tazminat hesabının dayanak tablosunu dosyaya ekleyin ve farkı açıklayın.",
    },
    {
      title: "Teslim edilen bağımsız bölümlere ilişkin eksik kayıt",
      contradiction_type: "MISSING_INFO",
      description:
        "Teslim edildiği belirtilen daireler için ayrı kabul ve teslim tutanakları dosyada yer almamaktadır.",
      involved_event_ids: [1, 6],
      severity: "LOW",
      confidence_score: 0.82,
      legal_basis: "TBK m.473 ve HMK m.190",
      recommended_action:
        "Teslim tutanaklarını ve ödeme kayıtlarını dosyaya kazandırın.",
    },
  ],
  total_contradictions_found: 3,
  risk_level: "HIGH",
  analysis_notes:
    "Davalı savunması ile teknik deliller arasındaki uyumsuzluklar nedeniyle yüksek risk tespit edilmiştir.",
};

