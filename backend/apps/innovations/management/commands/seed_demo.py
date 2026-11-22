from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import AdopterProfile
from apps.discovery.models import SavedComparison, SavedInnovation, ScoringConfig
from apps.implementation.models import ImplementationPlan, ImplementationStep
from apps.implementation.planner import (
    build_five_phases,
    build_missing_blockers,
    find_similar_innovations,
    select_plan_variant,
    select_recommendation_path,
)
from apps.ingestion.models import IngestionRun, InnovationAuditLog, SourceFeed
from apps.innovations.models import Evidence, Innovation, InnovationSource

User = get_user_model()


class Command(BaseCommand):
    help = "Idempotently seed demo innovations, sources, adopter profile, plans, and PCI admin."

    def handle(self, *args, **options):
        today = date(2026, 11, 21)

        records = [
            {
                "slug": "e-urzad-senior",
                "title_pl": "e-Urząd Seniora — Proste e-Usługi i Asystent Wniosków Gminy",
                "title_en": "Senior e-Municipality — Plain-Language Citizen Services",
                "short_summary_pl": "Nakładka na systemy gminne pomagająca seniorom załatwiać sprawy cyfrowo i ograniczająca liczbę wizyt w urzędzie.",
                "short_summary_en": "Municipal portal overlay helping seniors complete digital requests and reducing in-person office visits.",
                "problem_pl": "Seniorzy i osoby mniej sprawne cyfrowo rezygnują z e-usług i przychodzą osobiście do urzędu z niekompletnymi wnioskami.",
                "problem_en": "Seniors struggle with complex municipal portals and visit town halls in person with incomplete paperwork.",
                "solution_pl": "Uproszczone formularze krok po kroku zgodne z WCAG 2.2 AA, podpowiedzi głosowe i walidacja braków przed wysłaniem wniosku.",
                "solution_en": "Step-by-step WCAG 2.2 AA forms, read-aloud prompts, and pre-submission completeness checks.",
                "primary_area": "administrative",
                "innovation_character": ["process", "organizational", "social"],
                "sectors": ["administracja", "ICT"],
                "beneficiary_groups": [
                    "seniors_60_plus",
                    "disabilities_special_needs",
                    "social_digital_exclusion",
                    "public_orgs_communities",
                ],
                "target_org_types": ["public_institution"],
                "tags": ["seniorzy", "gmina", "e-usługi", "cyfrowe", "wizyty w urzędzie", "WCAG"],
                "organization_name": "Konsorcjum Samorządowe Podkarpacia (DEMO)",
                "organization_type": "public_institution",
                "origin_location": "Stalowa Wola, Podkarpackie",
                "deployment_level": "deployed",
                "trl": None,
                "verification_status": "verified",
                "verification_method": "Zweryfikowano raportem wdrożeniowym z 3 gmin (rekord demo)",
                "fetched_at": today - timedelta(days=3),
                "last_verified_at": today,
                "scores": {
                    "innovativeness": 80,
                    "application_potential": 96,
                    "transferability": 94,
                    "credibility": 90,
                },
                "strengths": [
                    "Wdrożone produkcyjnie w 3 gminach (14 200 spraw)",
                    "Spadek osobistych wizyt z niekompletnym wnioskiem o 41%",
                ],
                "risks": ["Wymaga podstawowej integracji z lokalnym EZD PUW"],
                "missing_info": ["Brak audytu NIS2 dla chmury współdzielonej powiatu"],
                "conflicting_info": [],
                "required_resources": [
                    "1 pracownik biura obsługi mieszkańca",
                    "1 informatyk urzędu przez 3 tygodnie",
                ],
                "metrics": [
                    "Spadek liczby wizyt osobistych w prostych sprawach o >= 25%",
                    "Odsetek niekompletnych wniosków < 12%",
                ],
                "partner_archetypes": [
                    "Regionalne Związki Gmin i Powiatów",
                    "Ośrodki Pomocy Społecznej / Kluby Seniora",
                ],
                "suggested_next_step": "Plan transferu i wdrożenia w gminie",
                "contact_info": {
                    "unit_name": "Biuro Cyfryzacji JST Stalowa Wola (DEMO)",
                    "contact_person": "Anna Zielińska",
                    "email": "biuro@eurzad-demo.pl",
                    "phone": "+48 15 000 44 10",
                },
                "sources": [
                    (
                        "Raport pilotażu e-Usług JST 2025/2026",
                        "Biuletyn Samorządowy",
                        "https://samorzad.gov.pl/web/cyfryzacja-jst",
                    ),
                    (
                        "Karta projektu Fundusze Europejskie",
                        "Fundusze Europejskie",
                        "https://www.funduszeeuropejskie.gov.pl/",
                    ),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Wdrożono w 3 gminach Podkarpacia — obsłużono 14 200 wniosków w 9 miesięcy.",
                        "Deployed in 3 municipalities handling 14,200 cases.",
                        "high",
                        "",
                    ),
                    (
                        "verified_fact",
                        "Liczba wizyt związanych z uzupełnianiem braków spadła o 41%.",
                        "Follow-up office visits dropped by 41%.",
                        "high",
                        "",
                    ),
                    (
                        "source_declaration",
                        "Konsorcjum udostępnia szablony formularzy w modelu otwartym.",
                        "Templates shared openly.",
                        "",
                        "",
                    ),
                    (
                        "system_calculation",
                        "Wskaźnik możliwości transferu (94%) i potencjału (96%) obliczono na podstawie 3 wdrożeń gminnych i otwartych szablonów.",
                        "Transferability (94%) and potential (96%) calculated from 3 municipal deployments.",
                        "high",
                        "",
                    ),
                    (
                        "ai_estimate",
                        "Szacowany czas adaptacji w kolejnej gminie: 4–6 tygodni.",
                        "Estimated rollout time: 4–6 weeks.",
                        "medium",
                        "Szacunek zakłada posiadanie systemu EZD.",
                    ),
                ],
            },
            {
                "slug": "aqua-guard-gdynia",
                "title_pl": "AquaGuard Gdynia — Czujniki Podtopień i Alerty Kryzysowe dla Gmin",
                "title_en": "AquaGuard Gdynia — Local Flood Sensors & Alerts",
                "short_summary_pl": "Rozwiązanie uczelni z Gdyni: autonomiczne sondy na przepustach wysyłające alerty SMS do sołtysów i OSP przed zalaniem dróg.",
                "short_summary_en": "Gdynia university culvert sensors sending SMS flood alerts to village leaders and fire brigades.",
                "problem_pl": "Gwałtowne opady powodują podtopienia dróg gminnych zanim mieszkańcy lub służby zauważą wezbranie wody.",
                "problem_en": "Flash storms flood local roads before municipal crews receive manual warnings.",
                "solution_pl": "Solarne czujniki ultradźwiękowe montowane pod mostkami przesyłają odczyty przez GSM/LoRaWAN i alarmują OSP.",
                "solution_en": "Solar ultrasonic probes under culverts send GSM/LoRaWAN telemetry and trigger fire-brigade SMS alerts.",
                "primary_area": "technological",
                "innovation_character": ["product", "process"],
                "sectors": ["administracja", "ICT", "zdrowie_jakosc_zycia"],
                "beneficiary_groups": [
                    "public_orgs_communities",
                    "seniors_60_plus",
                    "families_parents",
                ],
                "target_org_types": ["public_institution", "university"],
                "tags": ["podtopienia", "powódź", "czujniki", "sołectwo", "OSP", "Gdynia"],
                "organization_name": "Zespół Hydro-ICT Uczelni z Gdyni (DEMO)",
                "organization_type": "university",
                "origin_location": "Gdynia, Pomorskie",
                "deployment_level": "deployed",
                "trl": 8,
                "verification_status": "verified",
                "verification_method": "Scalono wpis PPM i raport wdrożeniowy 4 gmin",
                "fetched_at": today - timedelta(days=4),
                "last_verified_at": today,
                "scores": {
                    "innovativeness": 82,
                    "application_potential": 94,
                    "transferability": 92,
                    "credibility": 92,
                },
                "strengths": [
                    "12 miesięcy bezawaryjnej pracy na 19 przepustach",
                    "Skrócenie czasu reakcji OSP o 65%",
                ],
                "risks": ["Słaby zasięg GSM w głębokich dolinach"],
                "missing_info": ["Brak danych o pracy baterii przy -20°C przez 14 dni"],
                "conflicting_info": [],
                "required_resources": [
                    "Budżet ok. 14–18 tys. PLN na 5 punktów",
                    "Koordynator z OSP lub urzędu gminy",
                ],
                "metrics": [
                    "Powiadomienie SMS w < 5 min od przekroczenia stanu ostrzegawczego",
                    "100% przejezdności kluczowych przepustów",
                ],
                "partner_archetypes": [
                    "Centrum Transferu Technologii Uczelni",
                    "Ochotnicza Straż Pożarna",
                ],
                "suggested_next_step": "Transfer technologii i montaż na wytypowanych przepustach",
                "contact_info": {
                    "unit_name": "CTT Uczelnia Techniczna Gdynia (DEMO)",
                    "contact_person": "dr inż. Marek Kowalczyk",
                    "email": "ctt-hydro@demo-gdynia.edu.pl",
                    "phone": "+48 58 000 12 34",
                },
                "sources": [
                    (
                        "Portal Publikacji Naukowych PPM — HydroAlert",
                        "PPM",
                        "https://ppm.edu.pl/index.seam",
                    ),
                    (
                        "Raport wdrożeniowy 4 gmin pomorskich",
                        "Biuletyn JST",
                        "https://samorzad.gov.pl/",
                    ),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "System pracuje na 19 przepustach w 4 gminach od ponad 12 miesięcy.",
                        "Operating on 19 culverts in 4 municipalities for 12+ months.",
                        "high",
                        "",
                    ),
                    (
                        "verified_fact",
                        "Czas reakcji służb skrócono o 65%.",
                        "Response time cut by 65%.",
                        "high",
                        "",
                    ),
                    (
                        "source_declaration",
                        "Uczelnia oferuje gotową specyfikację montażu bez prac ziemnych.",
                        "No-dig mounting spec provided.",
                        "",
                        "",
                    ),
                    (
                        "system_calculation",
                        "Wiarygodność (92%) wyliczono z połączenia wpisu PPM i raportu wdrożeniowego 4 gmin.",
                        "Credibility (92%) computed from PPM registry and 4-municipality report.",
                        "high",
                        "",
                    ),
                    (
                        "ai_estimate",
                        "Koszt 5 punktów pomiarowych szacowany na 14–18 tys. PLN.",
                        "Estimated 5-point cost: 14–18k PLN.",
                        "medium",
                        "Nie obejmuje kosztów masztów wzmacniających GSM.",
                    ),
                ],
            },
            {
                "slug": "matematyka-ar-krosno",
                "title_pl": "Matematyka w Ruchu — Scenariusze AR dla Szkół Podstawowych",
                "title_en": "Math in Motion — Classroom AR Scenarios",
                "short_summary_pl": "Zestaw 18 scenariuszy lekcji matematyki łączących ruch i modele 3D na zwykłych tabletach bez zakupu gogli VR.",
                "short_summary_en": "18 math lesson plans combining movement and 3D AR models on standard school tablets without VR headsets.",
                "problem_pl": "Uczniowie mają problem z wyobraźnią przestrzenną w geometrii 3D, a szkoły nie mają środków na pracownie VR.",
                "problem_en": "Students struggle with 3D spatial geometry while schools lack budgets for VR labs.",
                "solution_pl": "Karty znaczników do druku i aplikacja przeglądarkowa WebAR działająca na szkolnych tabletach.",
                "solution_en": "Printable marker cards and WebAR browser tool running on standard tablets.",
                "primary_area": "educational",
                "innovation_character": ["product", "process"],
                "sectors": ["edukacja", "ICT"],
                "beneficiary_groups": [
                    "children_0_12",
                    "youth_13_18",
                    "students_teachers",
                    "disabilities_special_needs",
                ],
                "target_org_types": ["school", "university"],
                "tags": ["matematyka", "szkoły", "AR", "geometria", "Krosno"],
                "organization_name": "Pracownia Dydaktyki Krosno (DEMO)",
                "organization_type": "school",
                "origin_location": "Krosno, Podkarpackie",
                "deployment_level": "tests",
                "trl": None,
                "verification_status": "verified",
                "verification_method": "Sprawozdanie z innowacji pedagogicznej (ORE)",
                "fetched_at": today - timedelta(days=5),
                "last_verified_at": today - timedelta(days=1),
                "scores": {
                    "innovativeness": 80,
                    "application_potential": 95,
                    "transferability": 90,
                    "credibility": 82,
                },
                "strengths": [
                    "Przetestowane na 420 uczniach w 6 szkołach",
                    "Prawie zerowy koszt sprzętowy",
                ],
                "risks": ["Wymaga aktualnej przeglądarki na starszych tabletach"],
                "missing_info": ["Brak porównania wyników egzaminu ósmoklasisty z grupą kontrolną"],
                "conflicting_info": [],
                "required_resources": ["Drukarka i szkolne tablety", "1 nauczyciel matematyki"],
                "metrics": [">= 80% uczniów deklaruje lepsze rozumienie przekrojów brył"],
                "partner_archetypes": ["Ośrodek Doskonalenia Nauczycieli"],
                "suggested_next_step": "Pilotaż semestralny w 2–4 klasach",
                "contact_info": {
                    "unit_name": "Pracownia Dydaktyki Krosno (DEMO)",
                    "contact_person": "mgr Katarzyna Wójcik",
                    "email": "dydaktyka@demo-krosno.edu.pl",
                    "phone": "+48 13 000 55 12",
                },
                "sources": [
                    ("Sprawozdanie z innowacji pedagogicznej", "ORE", "https://www.ore.edu.pl/"),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Przetestowano z udziałem 420 uczniów klas 5–7.",
                        "Tested with 420 students in grades 5–7.",
                        "high",
                        "",
                    ),
                    (
                        "ai_estimate",
                        "Czas przygotowania lekcji szacowany na < 10 minut.",
                        "Prep time estimated under 10 minutes.",
                        "high",
                        "Na podstawie opinii nauczycieli z pilotażu.",
                    ),
                ],
            },
            {
                "slug": "aerosense-ndt",
                "title_pl": "AeroSense Composite NDT — Skaner Struktur Lotniczych",
                "title_en": "AeroSense Composite NDT — Aerospace Scanner",
                "short_summary_pl": "Hybrydowy skaner ultradźwiękowo-termograficzny do wykrywania delaminacji w kompozytach bez demontażu poszycia.",
                "short_summary_en": "Hybrid ultrasonic-thermographic scanner detecting composite delamination without airframe disassembly.",
                "problem_pl": "Inspekcje struktur kompozytowych w lotnictwie i motoryzacji wymagają kosztownych przestojów i stanowisk stacjonarnych.",
                "problem_en": "Composite inspections in aviation and automotive require costly downtime and stationary rigs.",
                "solution_pl": "Mobilna głowica łącząca termografię impulsową z ultradźwiękami oraz mapowaniem defektów 3D.",
                "solution_en": "Handheld head fusing pulsed thermography with phased-array ultrasound and 3D defect mapping.",
                "primary_area": "technological",
                "innovation_character": ["product", "process"],
                "sectors": ["lotnictwo", "sektor_kosmiczny", "motoryzacja"],
                "beneficiary_groups": ["entrepreneurs_startups", "workers_jobseekers"],
                "target_org_types": ["company", "startup", "university"],
                "tags": ["lotnictwo", "kompozyty", "NDT", "Rzeszów", "UPRP"],
                "organization_name": "Politechnika Rzeszowska / Lab NDT (DEMO)",
                "organization_type": "university",
                "origin_location": "Rzeszów, Podkarpackie",
                "deployment_level": "pilot",
                "trl": 6,
                "verification_status": "verified",
                "verification_method": "Zgłoszenie UPRP + karta grantu PCI",
                "fetched_at": today - timedelta(days=6),
                "last_verified_at": today,
                "scores": {
                    "innovativeness": 90,
                    "application_potential": 88,
                    "transferability": 78,
                    "credibility": 85,
                },
                "strengths": [
                    "Zgłoszenie patentowe UPRP P.448912",
                    "Walidacja TRL 6 na 18 panelach CFRP",
                ],
                "risks": ["Oczekiwana certyfikacja EASA Part-145"],
                "missing_info": ["Brak procedury akredytacji dla lotnictwa cywilnego"],
                "conflicting_info": [],
                "required_resources": ["Inżynier NDT poziom 2", "10 detali referencyjnych"],
                "metrics": ["Zgodność >= 95% względem referencyjnego C-scan"],
                "partner_archetypes": ["Zakład MRO / Tier-1 Lotniczy"],
                "suggested_next_step": "Transfer do prób przemysłowych z zakładem MRO",
                "contact_info": {
                    "unit_name": "Centrum Innowacji Politechniki Rzeszowskiej (DEMO)",
                    "contact_person": "dr inż. Piotr Mazur",
                    "email": "aerosense@demo-prz.edu.pl",
                    "phone": "+48 17 000 33 90",
                },
                "sources": [
                    (
                        "Zgłoszenie patentowe P.448912",
                        "UPRP",
                        "https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search",
                    ),
                    ("Karta projektu B+R PCI", "PCI", "https://pcinn.org/"),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Złożono krajowe zgłoszenie patentowe w UPRP.",
                        "Filed UPRP patent application.",
                        "high",
                        "",
                    ),
                    (
                        "verified_fact",
                        "Przeprowadzono badania TRL 6 na 18 panelach CFRP.",
                        "Completed TRL 6 tests on 18 CFRP panels.",
                        "high",
                        "",
                    ),
                ],
            },
            {
                "slug": "satguard-agro",
                "title_pl": "SatGuard Agro & Las — Monitoring Suszy z Danych Satelitarnych",
                "title_en": "SatGuard Agro & Forest — Satellite Drought Monitoring",
                "short_summary_pl": "Prototyp usługi przetwarzającej zobrazowania Copernicus Sentinel w tygodniowe alerty suszowe dla gmin i nadleśnictw.",
                "short_summary_en": "Prototype turning Copernicus Sentinel imagery into weekly drought briefings for municipalities and forestry.",
                "problem_pl": "Gminy wiejskie i leśnictwa nie mają prostych narzędzi do przekładania danych satelitarnych na alerty suszowe.",
                "problem_en": "Rural districts lack simple workflows to convert satellite imagery into drought alerts.",
                "solution_pl": "Automatyczny raport GIS/PDF generowany co tydzień dla wyznaczonych działek i sołectw.",
                "solution_en": "Automated weekly GIS/PDF briefing generated for municipal boundaries.",
                "primary_area": "technological",
                "innovation_character": ["product", "process"],
                "sectors": ["sektor_kosmiczny", "ICT", "administracja"],
                "beneficiary_groups": [
                    "public_orgs_communities",
                    "entrepreneurs_startups",
                    "adults_27_59",
                ],
                "target_org_types": ["public_institution", "startup", "company"],
                "tags": ["satelity", "susza", "Copernicus", "gmina", "Rzeszów"],
                "organization_name": "Podkarpackie Lab Kosmiczne (DEMO)",
                "organization_type": "startup",
                "origin_location": "Rzeszów, Podkarpackie",
                "deployment_level": "prototype",
                "trl": 4,
                "verification_status": "verified",
                "verification_method": "Katalog CORDIS / ESA BIC",
                "fetched_at": today - timedelta(days=2),
                "last_verified_at": today,
                "scores": {
                    "innovativeness": 84,
                    "application_potential": 82,
                    "transferability": 74,
                    "credibility": 75,
                },
                "strengths": ["Korelacja 0,81 z czujnikami naziemnymi na 4 poligonach"],
                "risks": ["Zachmurzenie ogranicza odczyty optyczne Sentinel-2"],
                "missing_info": ["Brak testów użyteczności raportów przez referentów gminnych"],
                "conflicting_info": [],
                "required_resources": [
                    "Plik SHP granic gminy",
                    "2h konsultacji z referentem rolnictwa",
                ],
                "metrics": ["Ocena użyteczności alertów >= 4/5 w 8-tygodniowym pilotażu"],
                "partner_archetypes": ["Gmina Wiejska / Nadleśnictwo"],
                "suggested_next_step": "Pilotaż użyteczności w 2 gminach",
                "contact_info": {
                    "unit_name": "Podkarpackie Lab Kosmiczne (DEMO)",
                    "contact_person": "inż. Tomasz Krawczyk",
                    "email": "satguard@demo-space.pl",
                    "phone": "+48 17 000 99 45",
                },
                "sources": [
                    (
                        "Karta projektu CORDIS Space Downstream",
                        "CORDIS",
                        "https://cordis.europa.eu/",
                    ),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Walidacja algorytmu na 4 poligonach (korelacja 0,81).",
                        "Validated on 4 test polygons (0.81 correlation).",
                        "high",
                        "",
                    ),
                    (
                        "ai_estimate",
                        "Oszacowano TRL 4 na podstawie testów laboratoryjnych.",
                        "Estimated TRL 4.",
                        "high",
                        "Wymaga testu operacyjnego w JST.",
                    ),
                ],
            },
            {
                "slug": "labmicrobe-ai",
                "title_pl": "LabMicrobe AI — Szybka Detekcja Biofilmów",
                "title_en": "LabMicrobe AI — Rapid Biofilm Detection",
                "short_summary_pl": "Wczesna koncepcja badawcza spektroskopii Ramana wspomaganej ML do wykrywania bakterii bez 48-godzinnej hodowli.",
                "short_summary_en": "Early ML Raman spectroscopy concept for bacterial detection without 48h culturing.",
                "problem_pl": "Klasyczne testy mikrobiologiczne trwają 24–72 h, opóźniając decyzje sanitarne.",
                "problem_en": "Traditional microbiological assays take 24–72 hours.",
                "solution_pl": "Koncepcja klasyfikatora widm wskazującego obecność biofilmu w kilka minut.",
                "solution_en": "Proposed spectral classifier flagging biofilm presence within minutes.",
                "primary_area": "technological",
                "innovation_character": ["product"],
                "sectors": ["zdrowie_jakosc_zycia", "ICT"],
                "beneficiary_groups": ["ill_needing_care", "entrepreneurs_startups"],
                "target_org_types": ["university", "company"],
                "tags": ["biotech", "spektroskopia", "TRL-2", "koncepcja"],
                "organization_name": "Zespół BioOptics Kraków (DEMO)",
                "organization_type": "other",
                "origin_location": "Kraków, Małopolska",
                "deployment_level": "concept",
                "trl": 2,
                "verification_status": "conflict",
                "verification_method": "Wykryto sprzeczność czasu pomiaru i brak prototypu",
                "fetched_at": today - timedelta(days=1),
                "last_verified_at": today - timedelta(days=1),
                "scores": {
                    "innovativeness": 78,
                    "application_potential": 70,
                    "transferability": 35,
                    "credibility": 38,
                },
                "strengths": ["Obiecujący przegląd literatury dla 2 szczepów"],
                "risks": ["Brak prototypu i badań na matrycach rzeczywistych"],
                "missing_info": ["Brak prototypu TRL 3–4", "Brak badania czystości patentowej FTO"],
                "conflicting_info": [
                    "Abstrakt podaje < 3 min pomiaru, lecz notatka prezentacyjna wskazuje 12 min przygotowania próbki."
                ],
                "required_resources": ["Dostęp do laboratorium i spektrometru referencyjnego"],
                "metrics": ["Czułość >= 85% na 30 próbkach laboratoryjnych"],
                "partner_archetypes": ["Laboratorium Uczelniane"],
                "suggested_next_step": "Walidacja potrzeb i eksperyment TRL 3",
                "contact_info": {
                    "unit_name": "Zespół BioOptics Kraków (DEMO)",
                    "contact_person": "mgr Jakub Nowak",
                    "email": "biooptics@demo-krakow.pl",
                    "phone": "+48 12 000 88 21",
                },
                "sources": [
                    (
                        "Abstrakt z seminarium pre-inkubacyjnego",
                        "PBN",
                        "https://pbn.nauka.gov.pl/core/#/home",
                    ),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Opublikowano abstrakt teoretyczny dla 2 szczepów modelowych.",
                        "Published theoretical abstract.",
                        "high",
                        "",
                    ),
                    (
                        "missing_info",
                        "Brak prototypu i wyników z próbek rzeczywistych.",
                        "Missing prototype and real-sample data.",
                        "",
                        "",
                    ),
                ],
            },
            {
                "slug": "spokojna-glowa-szkoly",
                "title_pl": "Spokojna Głowa — Anonimowe Wsparcie Psychologiczne dla Szkół",
                "title_en": "Calm Mind — Anonymous School Mental Health Support",
                "short_summary_pl": "Zanonimizowany system pierwszego kontaktu dla młodzieży w kryzysie psychicznym i pedagogów szkolnych.",
                "short_summary_en": "Anonymized first-contact triage for youth in mental health crisis and school counselors.",
                "problem_pl": "Młodzież obawia się stygmatyzacji przy bezpośrednim zgłaszaniu się do pedagoga szkolnego.",
                "problem_en": "Youth fear stigma when visiting school counselor offices.",
                "solution_pl": "Tokenowy czat wstępny bez zbierania danych osobowych ucznia na etapie triażu.",
                "solution_en": "Token-based initial triage chat without collecting student PII.",
                "primary_area": "educational",
                "innovation_character": ["social", "organizational"],
                "sectors": ["zdrowie_jakosc_zycia", "edukacja"],
                "beneficiary_groups": [
                    "youth_13_18",
                    "mental_crisis",
                    "families_parents",
                    "difficult_life_situation",
                ],
                "target_org_types": ["school", "social_org", "public_institution"],
                "tags": ["zdrowie psychiczne", "młodzież", "szkoły", "RODO"],
                "organization_name": "Fundacja Otwarte Wsparcie (DEMO)",
                "organization_type": "social_org",
                "origin_location": "Katowice, Śląskie",
                "deployment_level": "tests",
                "trl": None,
                "verification_status": "stale",
                "verification_method": "Rekord nieodświeżany od > 180 dni",
                "fetched_at": today - timedelta(days=190),
                "last_verified_at": today - timedelta(days=185),
                "scores": {
                    "innovativeness": 80,
                    "application_potential": 90,
                    "transferability": 76,
                    "credibility": 64,
                },
                "strengths": ["118 bezpiecznych konsultacji wstępnych w 3 liceach"],
                "risks": ["Rekord archiwalny — należy potwierdzić aktualność poradni"],
                "missing_info": ["Brak aktualizacji z II połowy 2026"],
                "conflicting_info": [],
                "required_resources": ["1 pedagog/psycholog szkolny", "Zgoda dyrekcji"],
                "metrics": ["Czas oczekiwania na rozmowę < 48 h"],
                "partner_archetypes": ["Powiatowa Poradnia Psychologiczno-Pedagogiczna"],
                "suggested_next_step": "Weryfikacja aktualności i pilotaż w 1 szkole",
                "contact_info": {
                    "unit_name": "Fundacja Otwarte Wsparcie (DEMO)",
                    "contact_person": "dr Ewa Kamińska",
                    "email": "wsparcie@spokojnaglowa-demo.org",
                    "phone": "+48 32 000 71 00",
                },
                "sources": [
                    (
                        "Raport projektu Interreg",
                        "Interreg",
                        "https://interreg.gov.pl/lista-projektow/",
                    ),
                ],
                "evidences": [
                    (
                        "verified_fact",
                        "Przeprowadzono 118 anonimowych konsultacji wstępnych.",
                        "Conducted 118 anonymous consultations.",
                        "medium",
                        "",
                    ),
                ],
            },
        ]

        ScoringConfig.objects.get_or_create(
            version="v1.0",
            defaults={
                "is_active": True,
                "problem_weight": 40,
                "sector_weight": 20,
                "beneficiary_weight": 20,
                "organization_fit_weight": 20,
                "min_score_threshold": 30,
                "low_confidence_threshold": 45,
                "classification_rules": {
                    "stale_after_days": 180,
                    "oslo_criteria": ["novelty", "implementation_or_availability", "value"],
                },
            },
        )

        radar_users_by_slug = {
            "e-urzad-senior": ["public_institutions", "individual_innovators"],
            "aqua-guard-gdynia": ["public_institutions", "universities_science"],
            "matematyka-ar-krosno": ["schools_education", "universities_science"],
            "aerosense-ndt": ["investors_commercial", "startups_enterprises", "universities_science"],
            "satguard-agro": ["public_institutions", "startups_enterprises", "investors_commercial"],
            "labmicrobe-ai": ["universities_science", "investors_commercial", "startups_enterprises"],
            "spokojna-glowa-szkoly": ["schools_education", "public_institutions"],
        }
        patent_status_by_slug = {
            "aerosense-ndt": "application_filed",
            "aqua-guard-gdynia": "patent_granted",
            "labmicrobe-ai": "unknown",
        }

        created_innovations: dict[str, Innovation] = {}
        for rec in records:
            slug = rec["slug"]
            sources_data = rec.pop("sources")
            evidences_data = rec.pop("evidences")
            rec.setdefault("is_public", True)
            rec.setdefault("is_synthetic_demo", True)
            rec.setdefault("is_incomplete", len(rec.get("missing_info", [])) >= 2)
            rec.setdefault("patent_status", patent_status_by_slug.get(slug, "none"))
            rec.setdefault(
                "radar_user_types",
                radar_users_by_slug.get(slug, ["public_institutions", "startups_enterprises"]),
            )
            rec.setdefault(
                "classification_provenance",
                {
                    "primary_area": "rule_based",
                    "innovation_character": "rule_based",
                    "sectors": "source",
                    "beneficiary_groups": "rule_based",
                    "trl": "ai_suggested" if slug == "satguard-agro" else "source",
                    "deployment_level": "source",
                },
            )
            rec.setdefault(
                "oslo_assessment",
                {
                    "compliant": True,
                    "novelty": "Rozwiązanie wprowadza istotnie ulepszony produkt lub proces w skali organizacji/sektora.",
                    "implementation_or_availability": f"Poziom wdrożenia: {rec['deployment_level']}.",
                    "value_rationale": rec["short_summary_pl"],
                },
            )

            inv, _ = Innovation.objects.update_or_create(slug=slug, defaults=rec)
            created_innovations[inv.slug] = inv

            inv.sources.all().delete()
            inv.evidences.all().delete()
            first_src = None
            for label, registry, url in sources_data:
                snapshot = (
                    f"[{registry}] {label} — {inv.title_pl}. "
                    f"Organizacja: {inv.organization_name}. Problem: {inv.problem_pl}"
                )
                src = InnovationSource.objects.create(
                    innovation=inv,
                    label=label,
                    registry=registry,
                    url=url,
                    fetched_at=inv.fetched_at,
                    last_verified_at=inv.last_verified_at,
                    is_available=True,
                    raw_snapshot=snapshot,
                    content_hash=InnovationSource.compute_hash(snapshot),
                )
                if first_src is None:
                    first_src = src

            for kind, text_pl, text_en, conf, lim in evidences_data:
                Evidence.objects.create(
                    innovation=inv,
                    kind=kind,
                    text_pl=text_pl,
                    text_en=text_en,
                    source=first_src if kind == "verified_fact" else None,
                    confidence=conf,
                    limitation_note=lim,
                )

            if not inv.audit_logs.exists():
                InnovationAuditLog.objects.create(
                    innovation=inv,
                    action="verify" if inv.verification_status == "verified" else "ingest",
                    actor="system",
                    verification_method=inv.verification_method,
                    changes={"verification_status": {"old": None, "new": inv.verification_status}},
                    note="Rekord zaindeksowany i zweryfikowany w pakiecie startowym.",
                )

        # Duplicate candidate for Admin merge demonstration
        aqua = created_innovations["aqua-guard-gdynia"]
        dup, _ = Innovation.objects.update_or_create(
            slug="aqua-guard-gdynia-dup",
            defaults={
                "title_pl": "System HydroAlert (duplikat z innego rejestru)",
                "title_en": "HydroAlert System (duplicate entry)",
                "short_summary_pl": "Czujniki poziomu wód na przepustach — rekord wykryty równolegle w bazie PARP.",
                "short_summary_en": "Culvert water sensors detected in parallel registry.",
                "problem_pl": aqua.problem_pl,
                "problem_en": aqua.problem_en,
                "solution_pl": aqua.solution_pl,
                "solution_en": aqua.solution_en,
                "primary_area": "technological",
                "innovation_character": ["product"],
                "sectors": ["administracja"],
                "beneficiary_groups": ["public_orgs_communities"],
                "target_org_types": ["public_institution"],
                "tags": ["powódź", "Gdynia"],
                "organization_name": "Uczelnia Techniczna w Gdyni",
                "organization_type": "university",
                "origin_location": "Gdynia, Pomorskie",
                "deployment_level": "deployed",
                "trl": 8,
                "verification_status": "pending_review",
                "verification_method": "Potencjalny duplikat (podobieństwo > 85%)",
                "is_public": True,
                "is_incomplete": True,
                "is_synthetic_demo": True,
                "fetched_at": today,
                "last_verified_at": today,
                "duplicate_of": aqua,
                "is_merged": False,
            },
        )
        dup.sources.all().delete()
        dup_snapshot = "[PARP] Wpis równoległy PARP — System HydroAlert, Uczelnia Techniczna w Gdyni."
        InnovationSource.objects.create(
            innovation=dup,
            label="Wpis równoległy PARP",
            registry="PARP",
            url="https://www.parp.gov.pl/",
            fetched_at=today,
            last_verified_at=today,
            raw_snapshot=dup_snapshot,
            content_hash=InnovationSource.compute_hash(dup_snapshot),
        )

        # Source feeds & ingestion runs
        now = timezone.now()
        SourceFeed.objects.all().delete()
        SourceFeed.objects.bulk_create(
            [
                SourceFeed(
                    name="UPRP & EPO — Rejestry Patentowe",
                    category="Nauka i patenty",
                    url="https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search",
                    method="API",
                    status="active",
                    last_synced_at=now,
                    records_count=231,
                ),
                SourceFeed(
                    name="PBN, PPM, PAN & Repozytoria Uczelni",
                    category="Nauka i patenty",
                    url="https://ppm.edu.pl/index.seam",
                    method="Document AI",
                    status="active",
                    last_synced_at=now,
                    records_count=312,
                ),
                SourceFeed(
                    name="NCBR, PARP, CORDIS, Interreg & UE",
                    category="Projekty B+R",
                    url="https://www.gov.pl/web/ncbr/wyszukiwarka-sukcesow-beneficjentow",
                    method="API",
                    status="active",
                    last_synced_at=now,
                    records_count=263,
                ),
                SourceFeed(
                    name="NCN — Baza Projektów",
                    category="Projekty B+R",
                    url="https://projekty.ncn.gov.pl/",
                    method="Web Crawl",
                    status="error",
                    error_message="HTTP 503 podczas ostatniego pobierania — źródło tymczasowo niedostępne.",
                    last_synced_at=now - timedelta(days=2),
                    records_count=84,
                ),
                SourceFeed(
                    name="Samorządy, Szkoły, CTT & Startupy",
                    category="Administracja i edukacja",
                    url="https://samorzad.gov.pl/",
                    method="Web Crawl",
                    status="stale",
                    error_message="Wykryto 1 rekord nieodświeżany od > 180 dni (Spokojna Głowa).",
                    last_synced_at=now - timedelta(days=1),
                    records_count=109,
                ),
            ]
        )

        if not IngestionRun.objects.exists():
            IngestionRun.objects.create(
                status="completed_with_warnings",
                new_records=1,
                updated_records=6,
                errors_count=1,
                summary="Zaindeksowano rekordy demo; 1 źródło (NCN) zwróciło HTTP 503.",
            )

        # Demo Adopter + PCI Admin accounts
        adopter_user, created = User.objects.get_or_create(
            username="soltys@trzebownisko.pl",
            defaults={"email": "soltys@trzebownisko.pl", "first_name": "Jan Kowalski"},
        )
        if created:
            adopter_user.set_password("demo1234")
            adopter_user.save()
        profile, _ = AdopterProfile.objects.update_or_create(
            user=adopter_user,
            defaults={
                "organization_type": "public_institution",
                "organization_name": "Gmina Trzebownisko",
                "role_title": "Sołtys Gminy",
                "deployment_location": "Trzebownisko, Podkarpackie",
                "potential_users_count": 3400,
                "current_approach": "Ręczne objazdy OSP podczas ulew",
                "available_resources": "Fundusz sołecki + zespół OSP",
                "team_competencies": "Koordynator kryzysowy w urzędzie",
                "target_timeline": "Q1 2027",
                "key_constraints": "Słaby zasięg GSM w jednej dolinie",
            },
        )

        SavedInnovation.objects.get_or_create(user=adopter_user, innovation=aqua)
        if not SavedComparison.objects.filter(user=adopter_user).exists():
            SavedComparison.objects.create(
                user=adopter_user,
                title="Porównanie rozwiązań dla gminy (AquaGuard vs e-Urząd Seniora)",
                innovation_slugs=["aqua-guard-gdynia", "e-urzad-senior"],
                query_context={"sector": "administracja"},
            )

        if not ImplementationPlan.objects.filter(user=adopter_user, innovation=aqua).exists():
            variant, rationale = select_plan_variant(aqua)
            rec_path, rec_rationale = select_recommendation_path(aqua, profile, variant)
            plan = ImplementationPlan.objects.create(
                user=adopter_user,
                innovation=aqua,
                variant=variant,
                variant_rationale=rationale,
                recommendation_path=rec_path,
                recommendation_rationale=rec_rationale,
                organization_snapshot={
                    "organization_name": profile.organization_name,
                    "organization_type": profile.organization_type,
                    "role_title": profile.role_title,
                    "deployment_location": profile.deployment_location,
                },
                comparison_slugs=["aqua-guard-gdynia", "e-urzad-senior"],
                requirements=aqua.required_resources,
                risks=aqua.risks,
                success_metrics=aqua.metrics,
                missing_info_blockers=build_missing_blockers(aqua, profile),
                similar_innovations=find_similar_innovations(aqua),
                partner_archetypes=aqua.partner_archetypes,
                user_reported_issues="Prośba o weryfikację pracy czujnika bez zasilania w dolinie potoku.",
            )
            for phase in build_five_phases(aqua, profile, variant):
                step_status = (
                    "completed"
                    if phase["phase_number"] <= 2
                    else "in_progress"
                    if phase["phase_number"] == 3
                    else "not_started"
                )
                ImplementationStep.objects.create(
                    plan=plan,
                    status=step_status,
                    notes="Wytypowano 4 przepusty z OSP." if phase["phase_number"] == 3 else "",
                    **phase,
                )

        admin_user, created_admin = User.objects.get_or_create(
            username="admin@pcinn.org",
            defaults={
                "email": "admin@pcinn.org",
                "first_name": "Operator PCI",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created_admin:
            admin_user.set_password("admin1234")
            admin_user.save()
        AdopterProfile.objects.update_or_create(
            user=admin_user,
            defaults={
                "organization_type": "public_institution",
                "organization_name": "Podkarpackie Centrum Innowacji",
                "role_title": "Administrator Praktoteki",
                "deployment_location": "Rzeszów, Podkarpackie",
                "is_pci_admin": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Seeded Praktoteka demo dataset successfully."))
