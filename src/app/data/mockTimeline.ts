/**
 * Mock data simulating a real /analyze/deep response (AnalysisResult).
 * Includes 12 timeline events + 5 rich contradictions for UI development.
 */

import type { AnalysisResultData } from "../components/TimelineView";

export const MOCK_ANALYSIS: AnalysisResultData = {
  // ── Phase 1: Timeline ────────────────────────────────────────────────────
  document_summary:
    "Bu dava, İstanbul merkezli bir inşaat şirketi olan Güçlü Yapı A.Ş. ile müteahhit Hasan Çelik arasındaki konut projesi sözleşmesinden kaynaklanan tazminat uyuşmazlığına ilişkindir. Davacı, sözleşme kapsamında teslim edilmeyen 12 konut bedeli ile gecikme tazminatı talep etmektedir. Yargılama süreci 2021 yılında başlamış olup Yargıtay aşamasına taşınan dava hâlâ derdesttir.",
  total_events_found: 12,
  primary_jurisdiction: "İstanbul 4. Asliye Ticaret Mahkemesi",
  case_number: "2021/1147 E.",
  events: [
    {
      date: "2019-03-15",
      description:
        "Güçlü Yapı A.Ş. ile Hasan Çelik arasında 12 adet konut inşaatı ve teslimi için 4.800.000 TL bedelli eser sözleşmesi imzalandı.",
      source_page: 2,
      entities: ["Güçlü Yapı A.Ş.", "Hasan Çelik", "Avukat Mert Doğan"],
      category: "Sözleşme / Anlaşma",
      significance:
        "Davanın temel hukuki dayanağını oluşturan sözleşme; teslim tarihi, ceza koşulu ve ödeme planını belirlemektedir.",
    },
    {
      date: "2020-09-01",
      description:
        "Sözleşmede öngörülen konut teslim tarihinin dolmasına karşın Hasan Çelik, 12 konuttan 8'ini teslim etmedi.",
      source_page: 3,
      entities: ["Hasan Çelik", "Güçlü Yapı A.Ş."],
      category: "Olay Anı",
      significance:
        "Teslim yükümlülüğünün ihlali, sözleşmedeki günlük 5.000 TL gecikme cezasını tetiklemiş ve dava hakkını doğurmuştur.",
    },
    {
      date: "2020-10-22",
      description:
        "Güçlü Yapı A.Ş. vekili Avukat Mert Doğan, Hasan Çelik'e noter aracılığıyla ihtarname göndererek 30 gün içinde teslim veya bedel iadesini talep etti.",
      source_page: 4,
      entities: ["Güçlü Yapı A.Ş.", "Avukat Mert Doğan", "Hasan Çelik", "Beyoğlu 3. Noteri"],
      category: "Tebligat / Bildirim",
      significance:
        "İhtarname, dava açılması için aranan ön koşul niteliğinde olup temerrüt tarihini kesin olarak belirlemiştir.",
    },
    {
      date: "2020-11-30",
      description:
        "İhtarnameye süresi içinde yanıt verilmemesi üzerine Güçlü Yapı A.Ş. tarafından İstanbul 4. Asliye Ticaret Mahkemesi'nde tazminat davası açıldı. Dava dilekçesinde 3.200.000 TL asıl alacak ve 427.000 TL gecikme tazminatı talep edildi.",
      source_page: 5,
      entities: [
        "Güçlü Yapı A.Ş.",
        "Hasan Çelik",
        "İstanbul 4. Asliye Ticaret Mahkemesi",
        "Avukat Mert Doğan",
      ],
      category: "Dilekçe / Başvuru",
      significance:
        "Dava dilekçesinde 3.200.000 TL asıl alacak ile 427.000 TL gecikme tazminatı talep edilmiştir.",
    },
    {
      date: "2021-02-10",
      description:
        "Davalı Hasan Çelik vekili, cevap dilekçesi sunarak sözleşmenin tamamen ifa edildiğini ve gecikmenin COVID-19 pandemisinden kaynaklanan mücbir sebepten kaynaklandığını ileri sürdü.",
      source_page: 6,
      entities: ["Hasan Çelik", "Avukat Selin Yıldız", "İstanbul 4. Asliye Ticaret Mahkemesi"],
      category: "Dilekçe / Başvuru",
      significance:
        "Mücbir sebep savunması, ispat yükünü davalıya yüklemiş ve bilirkişi incelemesini zorunlu kılmıştır.",
    },
    {
      date: "2021-05-18",
      description:
        "İlk duruşma gerçekleştirildi; mahkeme inşaat mühendisi ve inşaat hukuku uzmanından oluşan üç kişilik bilirkişi heyeti atadı.",
      source_page: 8,
      entities: [
        "Hâkim Elif Arslan",
        "Güçlü Yapı A.Ş.",
        "Hasan Çelik",
        "İstanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Mahkeme İşlemi",
      significance: null,
    },
    {
      date: "2021-10-04",
      description:
        "İnşaat mühendisi Ahmet Kılıç, duruşmada tanık sıfatıyla ifade vererek konutların yalnızca %40 oranında tamamlandığını, teslim edilenlerin ise sözleşme şartnamesine aykırılıklar içerdiğini beyan etti.",
      source_page: 10,
      entities: [
        "İnşaat Mühendisi Ahmet Kılıç",
        "Güçlü Yapı A.Ş.",
        "Hasan Çelik",
        "İstanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Tanık İfadesi",
      significance:
        "Uzman tanık ifadesi, davalının mücbir sebep savunmasını çürütmüş ve mahkemenin ara kararını doğrudan etkilemiştir.",
    },
    {
      date: "2022-01-27",
      description:
        "Bilirkişi kurulu raporunu mahkemeye sundu. Rapora göre tamamlanmayan konutların piyasa değeri 2.950.000 TL; gecikme tazminatı ise 380.000 TL olarak hesaplandı.",
      source_page: 12,
      entities: [
        "Bilirkişi Prof. Dr. Cihan Özdemir",
        "Bilirkişi Müh. Leyla Sarı",
        "İstanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Mahkeme İşlemi",
      significance:
        "Bilirkişi raporu, mahkemenin hüküm için esas aldığı asıl delil niteliğindedir.",
    },
    {
      date: "2022-06-15",
      description:
        "İstanbul 4. Asliye Ticaret Mahkemesi, bilirkişi raporunu esas alarak davalı Hasan Çelik'in davacıya 2.950.000 TL asıl alacak + 380.000 TL gecikme tazminatı + yargılama giderleri ödemesine hükmetti.",
      source_page: 15,
      entities: [
        "Hâkim Elif Arslan",
        "Güçlü Yapı A.Ş.",
        "Hasan Çelik",
        "İstanbul 4. Asliye Ticaret Mahkemesi",
      ],
      category: "Karar / Hüküm",
      significance:
        "Davacı lehine çıkan nihai karar, toplam 3.330.000 TL ödeme yükümlülüğü doğurmuştur. Davalı temyiz yoluna başvurmuştur.",
    },
    {
      date: "2022-08-03",
      description:
        "Davalı Hasan Çelik vekili, ilk derece mahkemesi kararına itiraz ederek Yargıtay 15. Hukuk Dairesi'ne temyiz başvurusunda bulundu.",
      source_page: 16,
      entities: ["Hasan Çelik", "Avukat Selin Yıldız", "Yargıtay 15. Hukuk Dairesi"],
      category: "Dilekçe / Başvuru",
      significance:
        "Temyiz başvurusu, kararın icraya konulmasını geçici olarak durduran icra takibinin askıya alınmasına yol açmıştır.",
    },
    {
      date: "2022-09-20",
      description:
        "Güçlü Yapı A.Ş. kararın kesinleşmesini beklemeksizin Hasan Çelik aleyhine İstanbul Anadolu İcra Dairesi'nde ihtiyati haciz kararı uygulaması başlattı.",
      source_page: 17,
      entities: [
        "Güçlü Yapı A.Ş.",
        "Avukat Mert Doğan",
        "İstanbul Anadolu 12. İcra Müdürlüğü",
        "Hasan Çelik",
      ],
      category: "İcra Takibi",
      significance:
        "İhtiyati haciz, davalının İstanbul'daki iki taşınmazının tapu kaydına işlenmiştir.",
    },
    {
      date: "2023-11-14",
      description:
        "Yargıtay 15. Hukuk Dairesi, ilk derece mahkemesinin kararını onadı; bilirkişi hesabında usul ve esas yönünden herhangi bir hata bulunmadığı tespit edildi.",
      source_page: 20,
      entities: ["Yargıtay 15. Hukuk Dairesi", "Güçlü Yapı A.Ş.", "Hasan Çelik"],
      category: "Karar / Hüküm",
      significance:
        "Yargıtay onayı ile karar kesinleşmiş; ihtiyati haciz icra haczine dönüşmüş ve tahsilat süreci başlamıştır.",
    },
  ],

  // ── Phase 2: Contradiction Analysis ──────────────────────────────────────
  total_contradictions_found: 5,
  risk_level: "HIGH",
  analysis_notes:
    "Belge, özellikle davalının savunmaları ile maddi olgular arasında ciddi iç tutarsızlıklar barındırmaktadır. Tanık ifadesi ve bilirkişi raporu davalı aleyhine güçlü delil oluştururken, gecikme tazminatı hesabındaki tutarsızlık ve teslim edildiği iddia edilen konut sayısındaki belirsizlik davacı tarafın da zayıf noktalarını oluşturmaktadır.",
  contradictions: [
    {
      title: "Sözleşme İfası İddiası ile Tanık Beyanı Çelişkisi",
      contradiction_type: "WITNESS_CONFLICT",
      description:
        "Olay #4 (2021-02-10): Hasan Çelik'in vekili cevap dilekçesinde sözleşmenin 'tamamen ifa edildiğini' açıkça beyan etmektedir. Ancak Olay #6 (2021-10-04): Uzman tanık İnşaat Mühendisi Ahmet Kılıç, mahkemede yemin altında verdiği ifadede konutların yalnızca %40 oranında tamamlandığını ve teslim edilenlerin şartname uyumsuzluğu içerdiğini belirtmiştir. Bu iki beyan birbirleriyle doğrudan çelişmektedir. Hukuki sonuç: Davalının sözleşme ifası savunması, uzman tanık ifadesiyle çürütülmüş olup bu çelişki mahkemenin davalı lehine karar vermesini neredeyse imkânsız kılmaktadır.",
      involved_event_ids: [4, 6],
      severity: "HIGH",
      confidence_score: 0.97,
      legal_basis:
        "Çelişkili Beyan (Contradictio in Terminis) — HMK m.200 Senetle İspat; TBK m.112 Borcun İfa Edilmemesi",
      recommended_action:
        "Tanık Ahmet Kılıç'ın mahkeme tutanağını ve imzalı raporunu davalının cevap dilekçesiyle birlikte Yargıtay dosyasına ekleyin. Davalının 'tam ifa' iddiasını destekleyen herhangi bir yazılı belge olup olmadığını araştırın.",
    },
    {
      title: "Gecikme Tazminatı Miktarında Rakam Uyumsuzluğu",
      contradiction_type: "FACTUAL_ERROR",
      description:
        "Olay #3 (2020-11-30): Dava dilekçesinde davacı tarafından talep edilen gecikme tazminatı 427.000 TL olarak belirtilmektedir. Olay #7 (2022-01-27): Mahkeme tarafından atanan bağımsız bilirkişi heyeti, gecikme tazminatını 380.000 TL olarak hesaplamıştır. Bu 47.000 TL'lik (~%11) fark açıklanmamıştır. Hukuki sonuç: Talep edilen miktar ile bilirkişi hesabı arasındaki fark, mahkemenin talep aşımı gerekçesiyle fazla talebi reddetmesine neden olmuş; bu durum yargılama giderlerinin hesabını etkileyebilir.",
      involved_event_ids: [3, 7],
      severity: "HIGH",
      confidence_score: 0.93,
      legal_basis:
        "HMK m.26 Taleple Bağlılık (Ultra Petita Yasağı) — Mahkeme talep edilen miktarı aşan karar veremez",
      recommended_action:
        "Gecikme tazminatının nasıl hesaplandığını netleştirin: Orijinal 427.000 TL hesabının dayanağını (günlük 5.000 TL × gün sayısı) belgeleyin ve bilirkişi raporundaki 380.000 TL hesabıyla kıyaslayın. Farkın kaynağını tespit edin.",
    },
    {
      title: "Mücbir Sebep Savunması ile Sözleşme Tarihinin Çelişkisi",
      contradiction_type: "WITNESS_CONFLICT",
      description:
        "Olay #4 (2021-02-10): Davalı Hasan Çelik'in vekili, inşaat gecikmesinin COVID-19 pandemisinden kaynaklanan mücbir sebepten ileri geldiğini savunmuştur. Ancak Olay #0 (2019-03-15): Sözleşme, pandemi başlamadan yaklaşık 12 ay önce (Mart 2019) imzalanmıştır ve teslim tarihi Eylül 2020 olarak belirlenmiştir. Pandemi Mart 2020'de Türkiye'yi etkilemeye başlamıştır; dolayısıyla teslim tarihine yalnızca 6 ay kalmışken başlayan pandemi tek başına mücbir sebep oluşturabilirdi. Ancak davalı, bu süre zarfında mahkemeye herhangi bir ek süre uzatma talebi sunmamış ya da sözleşme değişikliği başvurusunda bulunmamıştır.",
      involved_event_ids: [0, 4],
      severity: "MEDIUM",
      confidence_score: 0.81,
      legal_basis:
        "TBK m.136 İfa İmkânsızlığı (Mücbir Sebep) — Mücbir sebebin sözleşme yapılırken öngörülememesi ve kaçınılmaz olması gerekir",
      recommended_action:
        "Davalının Mart-Eylül 2020 dönemine ait inşaat ilerleme raporlarını, şantiye kayıtlarını ve olası pandemi tedbir başvurularını talep edin. Sözleşmede öngörülemez olay (force majeure) maddesi var mı araştırın.",
    },
    {
      title: "İhtarname Süresi Dolmadan Dava Açılması",
      contradiction_type: "TIMELINE_IMPOSSIBILITY",
      description:
        "Olay #2 (2020-10-22): İhtarnamede davalıya 'teslim veya bedel iadesi için 30 gün süre' verilmiştir. Bu süre 2020-11-21'de dolmaktadır. Olay #3 (2020-11-30): Dava, ihtarnamenin tebliğinden yalnızca 39 gün sonra açılmıştır (2020-11-30). İhtarname 22 Ekim 2020'de gönderilmiş ve tebliğ tarihi belirsizdir. Eğer tebliğ 22 Ekim'den sonraki bir tarihte gerçekleşmişse (örneğin 25 Ekim), 30 günlük süre 24 Kasım'a kadar uzayacak ve dava, süre dolmadan açılmış olacaktır. Bu usul hatası davanın reddi riskini doğurabilir.",
      involved_event_ids: [2, 3],
      severity: "MEDIUM",
      confidence_score: 0.74,
      legal_basis:
        "HMK m.317 — İhtarname tebliğ tarihi ve ihtarlı sürenin hesabı; noter tebliğine ilişkin Noterlik Kanunu m.98",
      recommended_action:
        "İhtarnamenin noter tebliğ makbuzunu ve davalıya ulaşma tarihini acilen temin edin. Tebliğ tarihi 22 Ekim'den sonraysa dava dilekçesinin usul yönünden incelenmesi gerekmektedir.",
    },
    {
      title: "Sözleşmedeki 12 Konuttan Yalnızca 8'inin Açıklanması",
      contradiction_type: "MISSING_INFO",
      description:
        "Olay #0 (2019-03-15): Eser sözleşmesi 12 adet konutun inşaatını ve teslimini kapsamaktadır. Olay #1 (2020-09-01): Teslim tarihi ihlalinde 'Hasan Çelik, 12 konuttan 8'ini teslim etmedi' ifadesi kullanılmaktadır. Bu ifade, 4 konutun teslim edildiğini ima etmektedir. Ancak belgenin hiçbir yerinde: (a) Teslim edildiği ima edilen 4 konutun hangileri olduğu, (b) Bu 4 konutun kabul/red durumu, (c) Bu 4 konutun bedelinin ödenip ödenmediği açıklanmamaktadır. Bilirkişi raporu da yalnızca 'tamamlanmayan konutlar' üzerinden hesap yapmış; teslim edilen konutların değeri tartışılmamıştır.",
      involved_event_ids: [0, 1, 7],
      severity: "LOW",
      confidence_score: 0.88,
      legal_basis:
        "TBK m.473 — Eser Sözleşmesinde Kısmi İfa; HMK m.190 İspat Yükü",
      recommended_action:
        "Teslim edildiği iddia edilen 4 konutun teslimine ilişkin tutanakları ve kabul belgelerini dosyaya kazandırın. Bu bilgi bilirkişi hesabını ve talep edilen miktarı doğrudan etkileyebilir.",
    },
  ],
};
