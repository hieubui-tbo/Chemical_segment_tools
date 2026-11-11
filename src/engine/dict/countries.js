/* ═══════════════════════════════════════════════════════════════
   TỪ ĐIỂN QUỐC GIA — ISO2 | ISO3 | Tên chuẩn | Châu lục | bí danh (EN/VN)
   Châu lục: AS=Châu Á, EU=Châu Âu, AF=Châu Phi, AM=Châu Mỹ, OC=Châu Đại Dương
   ═══════════════════════════════════════════════════════════════ */
import { normText } from "../text.js";

export const CONTINENT_LABEL = {
  AS: "Châu Á", EU: "Châu Âu", AF: "Châu Phi", AM: "Châu Mỹ", OC: "Châu Đại Dương", XX: "Không xác định",
};

export const SEA_CODES = new Set(["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "TL", "VN"]);

const RAW = `
AF|AFG|Afghanistan|AS|
AL|ALB|Albania|EU|
DZ|DZA|Algeria|AF|AN GIE RI;ALGERIE
AD|AND|Andorra|EU|
AO|AGO|Angola|AF|
AG|ATG|Antigua and Barbuda|AM|ANTIGUA
AR|ARG|Argentina|AM|ACHENTINA
AM|ARM|Armenia|AS|
AW|ABW|Aruba|AM|
AU|AUS|Australia|OC|UC;AUSTRALIAN;COMMONWEALTH OF AUSTRALIA
AT|AUT|Austria|EU|
AZ|AZE|Azerbaijan|AS|
BS|BHS|Bahamas|AM|THE BAHAMAS
BH|BHR|Bahrain|AS|
BD|BGD|Bangladesh|AS|BANG LA DET
BB|BRB|Barbados|AM|
BY|BLR|Belarus|EU|BELARUS REPUBLIC
BE|BEL|Belgium|EU|BELGIQUE
BZ|BLZ|Belize|AM|
BJ|BEN|Benin|AF|
BM|BMU|Bermuda|AM|
BT|BTN|Bhutan|AS|
BO|BOL|Bolivia|AM|BOLIVIA PLURINATIONAL STATE OF
BA|BIH|Bosnia and Herzegovina|EU|BOSNIA
BW|BWA|Botswana|AF|
BR|BRA|Brazil|AM|BRASIL
BN|BRN|Brunei|AS|BRUNEI DARUSSALAM
BG|BGR|Bulgaria|EU|
BF|BFA|Burkina Faso|AF|
BI|BDI|Burundi|AF|
CV|CPV|Cabo Verde|AF|CAPE VERDE
KH|KHM|Cambodia|AS|CAMPUCHIA;CAM PU CHIA;KAMPUCHEA
CM|CMR|Cameroon|AF|
CA|CAN|Canada|AM|
KY|CYM|Cayman Islands|AM|
CF|CAF|Central African Republic|AF|
TD|TCD|Chad|AF|
CL|CHL|Chile|AM|CHI LE
CN|CHN|China|AS|TRUNG QUOC;PEOPLES REPUBLIC OF CHINA;PEOPLE S REPUBLIC OF CHINA;PR CHINA;CHINA PR;PRC;CHINA MAINLAND;MAINLAND CHINA;CHINA PEOPLES REPUBLIC
CO|COL|Colombia|AM|
KM|COM|Comoros|AF|
CG|COG|Congo|AF|REPUBLIC OF THE CONGO;CONGO REPUBLIC;CONGO BRAZZAVILLE
CD|COD|Democratic Republic of the Congo|AF|DR CONGO;DRC;CONGO DR;CONGO DEMOCRATIC REPUBLIC;CONGO KINSHASA;DEMOCRATIC REPUBLIC OF CONGO
CR|CRI|Costa Rica|AM|MOIN;PUERTO MOIN;PUERTO LIMON
CI|CIV|Cote d'Ivoire|AF|COTE D IVOIRE;COTE DIVOIRE;IVORY COAST;BO BIEN NGA
HR|HRV|Croatia|EU|
CU|CUB|Cuba|AM|
CW|CUW|Curacao|AM|
CY|CYP|Cyprus|AS|SIP
CZ|CZE|Czech Republic|EU|CZECHIA;SEC;CZECH
DK|DNK|Denmark|EU|DAN MACH
DJ|DJI|Djibouti|AF|
DM|DMA|Dominica|AM|
DO|DOM|Dominican Republic|AM|DOMINICAN;REPUBLICA DOMINICANA;DOMINICAN REP
EC|ECU|Ecuador|AM|
EG|EGY|Egypt|AF|AI CAP;AI CAP EGYPT
SV|SLV|El Salvador|AM|
GQ|GNQ|Equatorial Guinea|AF|
ER|ERI|Eritrea|AF|
EE|EST|Estonia|EU|
SZ|SWZ|Eswatini|AF|SWAZILAND
ET|ETH|Ethiopia|AF|
FJ|FJI|Fiji|OC|
FI|FIN|Finland|EU|PHAN LAN
FR|FRA|France|EU|PHAP
GF|GUF|French Guiana|AM|GUIANA;GUIANA FR;GUYANE
PF|PYF|French Polynesia|OC|POLYNESIA;POLYNESIA FR;TAHITI
GA|GAB|Gabon|AF|
GM|GMB|Gambia|AF|THE GAMBIA
GE|GEO|Georgia|AS|
DE|DEU|Germany|EU|DUC;DEUTSCHLAND;FEDERAL REPUBLIC OF GERMANY
GH|GHA|Ghana|AF|
GI|GIB|Gibraltar|EU|
GR|GRC|Greece|EU|HY LAP
GL|GRL|Greenland|AM|
GD|GRD|Grenada|AM|
GP|GLP|Guadeloupe|AM|GUADELOUPE FR
GU|GUM|Guam|OC|
GT|GTM|Guatemala|AM|
GN|GIN|Guinea|AF|
GW|GNB|Guinea-Bissau|AF|GUINEA BISSAU
GY|GUY|Guyana|AM|
HT|HTI|Haiti|AM|
HN|HND|Honduras|AM|
HK|HKG|Hong Kong|AS|HONG KONG SAR;HONG KONG CHINA;HONGKONG;HONG KONG SAR CHINA;HONG CONG
HU|HUN|Hungary|EU|HUNG GA RI
IS|ISL|Iceland|EU|
IN|IND|India|AS|AN DO;REPUBLIC OF INDIA
ID|IDN|Indonesia|AS|IN DO NE XI A;IN DO NE SIA
IR|IRN|Iran|AS|IRAN ISLAMIC REPUBLIC OF;ISLAMIC REPUBLIC OF IRAN
IQ|IRQ|Iraq|AS|
IE|IRL|Ireland|EU|AI LEN;REPUBLIC OF IRELAND
IL|ISR|Israel|AS|
IT|ITA|Italy|EU|Y;ITALIA
JM|JAM|Jamaica|AM|
JP|JPN|Japan|AS|NHAT BAN;NHAT;NIPPON
JO|JOR|Jordan|AS|
KZ|KAZ|Kazakhstan|AS|
KE|KEN|Kenya|AF|
KI|KIR|Kiribati|OC|
KP|PRK|North Korea|AS|TRIEU TIEN;DPRK;KOREA DPR;KOREA NORTH;DEMOCRATIC PEOPLES REPUBLIC OF KOREA;KOREA DEMOCRATIC PEOPLES REPUBLIC OF
KR|KOR|South Korea|AS|HAN QUOC;KOREA;REPUBLIC OF KOREA;KOREA REPUBLIC OF;KOREA REPUBLIC;KOREA SOUTH;KOREA REP
XK|XKX|Kosovo|EU|
KW|KWT|Kuwait|AS|CO OET
KG|KGZ|Kyrgyzstan|AS|KYRGYZ REPUBLIC
LA|LAO|Laos|AS|LAO PDR;LAO PEOPLES DEMOCRATIC REPUBLIC;LAO PEOPLE S DEMOCRATIC REPUBLIC;LAO
LV|LVA|Latvia|EU|
LB|LBN|Lebanon|AS|
LS|LSO|Lesotho|AF|
LR|LBR|Liberia|AF|
LY|LBY|Libya|AF|
LI|LIE|Liechtenstein|EU|
LT|LTU|Lithuania|EU|
LU|LUX|Luxembourg|EU|
MO|MAC|Macau|AS|MACAO;MACAO SAR;MACAU SAR;MACAO CHINA;MA CAO
MG|MDG|Madagascar|AF|
MW|MWI|Malawi|AF|
MY|MYS|Malaysia|AS|MA LAI XI A;MALAI XIA
MV|MDV|Maldives|AS|
ML|MLI|Mali|AF|
MT|MLT|Malta|EU|
MH|MHL|Marshall Islands|OC|
MQ|MTQ|Martinique|AM|MARTINIQUE FR
MR|MRT|Mauritania|AF|
MU|MUS|Mauritius|AF|
MX|MEX|Mexico|AM|MEHICO;MEXICO UNITED MEXICAN STATES
FM|FSM|Micronesia|OC|
MD|MDA|Moldova|EU|REPUBLIC OF MOLDOVA
MC|MCO|Monaco|EU|
MN|MNG|Mongolia|AS|MONG CO
ME|MNE|Montenegro|EU|
MA|MAR|Morocco|AF|MA ROC
MZ|MOZ|Mozambique|AF|
MM|MMR|Myanmar|AS|BURMA;MIEN DIEN
NA|NAM|Namibia|AF|
NR|NRU|Nauru|OC|
NP|NPL|Nepal|AS|
NL|NLD|Netherlands|EU|HA LAN;HOLLAND;THE NETHERLANDS;NETHERLANDS THE
NC|NCL|New Caledonia|OC|NEW CALEDONIA FR;NOUVELLE CALEDONIE
NZ|NZL|New Zealand|OC|NIU DI LAN;TAN TAY LAN
NI|NIC|Nicaragua|AM|
NE|NER|Niger|AF|
NG|NGA|Nigeria|AF|
MK|MKD|North Macedonia|EU|MACEDONIA
NO|NOR|Norway|EU|NA UY
OM|OMN|Oman|AS|
PK|PAK|Pakistan|AS|
PW|PLW|Palau|OC|
PS|PSE|Palestine|AS|STATE OF PALESTINE
PA|PAN|Panama|AM|
PG|PNG|Papua New Guinea|OC|PAPUA N GUINEA
PY|PRY|Paraguay|AM|
PE|PER|Peru|AM|
PH|PHL|Philippines|AS|PHI LIP PIN;PHILIPPIN;PHILLIPINES;PHILIPINES
PL|POL|Poland|EU|BA LAN
PT|PRT|Portugal|EU|BO DAO NHA
PR|PRI|Puerto Rico|AM|
QA|QAT|Qatar|AS|CA TA
RE|REU|Reunion|AF|REUNION FR
RO|ROU|Romania|EU|RU MA NI
RU|RUS|Russia|EU|LIEN BANG NGA;RUSSIAN FEDERATION;RUSSIAN FED;RUSSIA FEDERATION
RW|RWA|Rwanda|AF|
KN|KNA|Saint Kitts and Nevis|AM|
LC|LCA|Saint Lucia|AM|
VC|VCT|Saint Vincent and the Grenadines|AM|
WS|WSM|Samoa|OC|
SM|SMR|San Marino|EU|
ST|STP|Sao Tome and Principe|AF|
SA|SAU|Saudi Arabia|AS|A RAP XE UT;A RAP SAUDI;KINGDOM OF SAUDI ARABIA;KSA
SN|SEN|Senegal|AF|
RS|SRB|Serbia|EU|
SC|SYC|Seychelles|AF|
SL|SLE|Sierra Leone|AF|
SG|SGP|Singapore|AS|SING GA PO;XIN GA PO;REPUBLIC OF SINGAPORE
SK|SVK|Slovakia|EU|SLOVAK REPUBLIC
SI|SVN|Slovenia|EU|
SB|SLB|Solomon Islands|OC|
SO|SOM|Somalia|AF|
ZA|ZAF|South Africa|AF|NAM PHI;REPUBLIC OF SOUTH AFRICA
SS|SSD|South Sudan|AF|
ES|ESP|Spain|EU|TAY BAN NHA;ESPANA
LK|LKA|Sri Lanka|AS|
SD|SDN|Sudan|AF|
SR|SUR|Suriname|AM|
SE|SWE|Sweden|EU|THUY DIEN
CH|CHE|Switzerland|EU|THUY SI;SWISS
SY|SYR|Syria|AS|SYRIAN ARAB REPUBLIC
TW|TWN|Taiwan|AS|DAI LOAN;CHINESE TAIPEI;TAIWAN ROC;TAIWAN PROVINCE OF CHINA;REPUBLIC OF CHINA;TAIWAN CHINA
TJ|TJK|Tajikistan|AS|
TZ|TZA|Tanzania|AF|UNITED REPUBLIC OF TANZANIA
TH|THA|Thailand|AS|THAI LAN;THAI;KINGDOM OF THAILAND
TL|TLS|Timor-Leste|AS|EAST TIMOR;DONG TIMOR;TIMOR LESTE
TG|TGO|Togo|AF|
TO|TON|Tonga|OC|
TT|TTO|Trinidad and Tobago|AM|TRINIDAD;TRINIDAD TOBAGO
TN|TUN|Tunisia|AF|
TR|TUR|Turkey|AS|THO NHI KY;TURKIYE
TM|TKM|Turkmenistan|AS|
TV|TUV|Tuvalu|OC|
UG|UGA|Uganda|AF|
UA|UKR|Ukraine|EU|U CRAI NA
AE|ARE|United Arab Emirates|AS|UAE;U A E;CAC TIEU VUONG QUOC A RAP THONG NHAT;EMIRATES;DUBAI
GB|GBR|United Kingdom|EU|ANH;UK;U K;GREAT BRITAIN;BRITAIN;ENGLAND;UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND;SCOTLAND;WALES;NORTHERN IRELAND
US|USA|United States|AM|HOA KY;USA;U S A;U S;UNITED STATES OF AMERICA;AMERICA
UY|URY|Uruguay|AM|
UZ|UZB|Uzbekistan|AS|
VU|VUT|Vanuatu|OC|
VA|VAT|Vatican City|EU|HOLY SEE
VE|VEN|Venezuela|AM|VENEZUELA BOLIVARIAN REPUBLIC OF
TC|TCA|Turks and Caicos Islands|AM|TURKS AND CAICOS;PROVIDENCIALES
VG|VGB|British Virgin Islands|AM|VIRGIN ISLANDS GB;BRITISH VIRGIN ISLANDS;BVI;VIRGIN ISLANDS BRITISH
VI|VIR|US Virgin Islands|AM|VIRGIN ISLANDS US;US VIRGIN ISLANDS
WF|WLF|Wallis and Futuna|OC|WALLIS AND FUTUNA;WALLIS AND FUTUNA FR
YT|MYT|Mayotte|AF|MAYOTTE FR
BQ|BES|Caribbean Netherlands|AM|CARIBBEAN NL;BONAIRE;BONAIRE SINT EUSTATIUS AND SABA
SX|SXM|Sint Maarten|AM|SINT MAARTEN;SAINT MARTIN
AI|AIA|Anguilla|AM|
MS|MSR|Montserrat|AM|
FO|FRO|Faroe Islands|EU|FAROE
AS|ASM|American Samoa|OC|
MP|MNP|Northern Mariana Islands|OC|SAIPAN
CK|COK|Cook Islands|OC|
VN|VNM|Vietnam|AS|VIET NAM;VIETNAM;SOCIALIST REPUBLIC OF VIETNAM;SOCIALIST REPUBLIC OF VIET NAM;CONG HOA XA HOI CHU NGHIA VIET NAM;VN
YE|YEM|Yemen|AS|
ZM|ZMB|Zambia|AF|
ZW|ZWE|Zimbabwe|AF|
`;

export const COUNTRIES = [];
const EXACT = new Map();     // chuỗi chuẩn hóa → entry
const PHRASES = [];          // [phrase, entry] dùng cho so khớp chứa cụm từ (chỉ cụm ≥ 4 ký tự)

RAW.trim().split("\n").forEach((line) => {
  const [iso2, iso3, name, cont, aliases] = line.split("|");
  const entry = { code: iso2, iso3, name, continent: cont, isSEA: SEA_CODES.has(iso2) };
  COUNTRIES.push(entry);
  const keys = [name, iso2, iso3, ...(aliases ? aliases.split(";") : [])];
  keys.forEach((k) => {
    const nk = normText(k);
    if (!nk) return;
    if (!EXACT.has(nk)) EXACT.set(nk, entry);
    // Mã ISO & bí danh quá ngắn không dùng cho so khớp "chứa" để tránh nhận nhầm
    if (nk.length >= 4 && nk !== normText(iso3)) PHRASES.push([nk, entry]);
  });
});
PHRASES.sort((a, b) => b[0].length - a[0].length);

const NOISE = /\b(THE|REPUBLIC OF|REP OF|REP|KINGDOM OF|STATE OF|ISLAMIC|FEDERAL|DEMOCRATIC|PEOPLES|PEOPLE S|SAR|PROVINCE OF)\b/g;

/** Trạng thái nhận diện quốc gia — dùng hằng số này khi so sánh (đổi câu chữ ở một chỗ). */
export const COUNTRY_STATUS = { OK: "Đã nhận diện", BLANK: "Trống", UNKNOWN: "Không nhận diện" };

const cache = new Map();

/**
 * Chuẩn hóa quốc gia. Trả về { code, name, continent, continentLabel, isSEA, status }
 * status: "Đã nhận diện" | "Trống" | "Không nhận diện"
 */
export function resolveCountry(raw) {
  const key = String(raw ?? "");
  if (cache.has(key)) return cache.get(key);
  const out = resolveUncached(key);
  if (cache.size < 50000) cache.set(key, out);
  return out;
}

function pack(entry, status) {
  if (!entry) return { code: "", name: "", continent: "XX", continentLabel: CONTINENT_LABEL.XX, isSEA: false, status };
  return { code: entry.code, name: entry.name, continent: entry.continent, continentLabel: CONTINENT_LABEL[entry.continent], isSEA: entry.isSEA, status };
}

const UNKNOWN_COUNTRY = new Set(["OTHER COUNTRY", "OTHER COUNTRIES", "VARIOS", "VARIOUS", "PAISES NO DECLARADOS", "NO DECLARADO", "SIN DATOS", "MULTIPLE", "UNKNOW", "UNKNOWN", "UNK", "N A", "NA", "NONE", "NULL", "OTHER", "OTHERS", "NOT AVAILABLE", "NOT SPECIFIED", "UNSPECIFIED", "KHONG XAC DINH", "KHONG RO", "XX", "ZZ", "0", "TBA", "TBD"]);

function resolveUncached(raw) {
  const n = normText(raw);
  if (!n || UNKNOWN_COUNTRY.has(n)) return pack(null, COUNTRY_STATUS.BLANK);
  // 1) khớp chính xác (tên, ISO2, ISO3, bí danh EN/VN)
  if (EXACT.has(n)) return pack(EXACT.get(n), COUNTRY_STATUS.OK);
  // 2) bỏ phần trong ngoặc / từ nhiễu rồi thử lại
  const noParen = normText(String(raw).replace(/\(.*?\)/g, " "));
  if (noParen && EXACT.has(noParen)) return pack(EXACT.get(noParen), COUNTRY_STATUS.OK);
  const denoised = n.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  if (denoised && EXACT.has(denoised)) return pack(EXACT.get(denoised), COUNTRY_STATUS.OK);
  // 3) chứa trọn một cụm tên quốc gia (≥4 ký tự, theo ranh giới từ) — ưu tiên cụm dài nhất
  const padded = " " + n + " ";
  for (const [ph, entry] of PHRASES) {
    if (padded.includes(" " + ph + " ")) return pack(entry, COUNTRY_STATUS.OK);
  }
  return pack(null, COUNTRY_STATUS.UNKNOWN);
}

export const VIETNAM_CODE = "VN";
