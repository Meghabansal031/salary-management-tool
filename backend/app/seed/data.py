"""Raw material for the generator: roles and pay bands, headcount weights, names."""

from dataclasses import dataclass
from datetime import date

EMAIL_DOMAIN = "acme.com"
EARLIEST_HIRE_DATE = date(2012, 1, 1)
# Fixed on purpose. Using today's date would make the data change from day to day.
REFERENCE_DATE = date(2025, 12, 31)


@dataclass(frozen=True)
class Role:
    title: str
    low_usd: int  # annual base salary band in the US, in USD
    high_usd: int
    weight: int  # how common the role is (junior roles are more common than managers)


# 10 departments. Each job title belongs to exactly one department.
JOB_CATALOG: dict[str, tuple[Role, ...]] = {
    "Engineering": (
        Role("Software Engineer", 95_000, 150_000, 14),
        Role("Senior Software Engineer", 140_000, 200_000, 8),
        Role("Engineering Manager", 170_000, 240_000, 2),
        Role("QA Engineer", 70_000, 110_000, 4),
        Role("DevOps Engineer", 100_000, 155_000, 3),
    ),
    "Product": (
        Role("Product Manager", 110_000, 170_000, 4),
        Role("Senior Product Manager", 150_000, 210_000, 2),
        Role("Product Designer", 85_000, 135_000, 3),
    ),
    "Data": (
        Role("Data Analyst", 70_000, 110_000, 5),
        Role("Data Scientist", 110_000, 165_000, 3),
        Role("Data Engineer", 105_000, 160_000, 3),
    ),
    "Sales": (
        Role("Sales Representative", 55_000, 95_000, 8),
        Role("Account Executive", 75_000, 130_000, 5),
        Role("Sales Manager", 110_000, 170_000, 2),
    ),
    "Marketing": (
        Role("Marketing Specialist", 55_000, 90_000, 4),
        Role("Content Strategist", 60_000, 95_000, 2),
        Role("Marketing Manager", 95_000, 150_000, 2),
    ),
    "Finance": (
        Role("Financial Analyst", 70_000, 110_000, 3),
        Role("Accountant", 60_000, 95_000, 3),
        Role("Finance Manager", 110_000, 165_000, 1),
    ),
    "People": (
        Role("HR Specialist", 55_000, 85_000, 3),
        Role("Recruiter", 55_000, 90_000, 3),
        Role("HR Manager", 95_000, 145_000, 1),
    ),
    "Operations": (
        Role("Operations Analyst", 60_000, 95_000, 4),
        Role("Operations Manager", 95_000, 150_000, 2),
        Role("Customer Support Specialist", 40_000, 65_000, 7),
    ),
    "Legal": (
        Role("Legal Counsel", 120_000, 190_000, 1),
        Role("Paralegal", 55_000, 85_000, 1),
    ),
    "IT": (
        Role("IT Support Specialist", 50_000, 80_000, 3),
        Role("Systems Administrator", 75_000, 115_000, 2),
        Role("Security Engineer", 110_000, 165_000, 2),
    ),
}

TITLE_BANDS: dict[str, Role] = {
    role.title: role for roles in JOB_CATALOG.values() for role in roles
}

# Share of the workforce per country (relative weights, one entry per supported country).
COUNTRY_WEIGHTS: dict[str, int] = {
    "US": 24, "IN": 18, "GB": 10, "DE": 9, "CA": 7, "FR": 6,
    "AU": 6, "SG": 5, "JP": 5, "NL": 4, "BR": 3, "AE": 3,
}  # fmt: skip

# Names are plain ASCII so generated emails stay simple.
NAME_POOLS: dict[str, tuple[tuple[str, ...], tuple[str, ...]]] = {
    "anglo": (
        ("James", "Emily", "Oliver", "Chloe", "John", "Sophie", "Michael", "Emma", "Daniel", "Olivia"),
        ("Smith", "Brown", "Wilson", "Taylor", "Davis", "Carter", "Evans", "Walker", "Clark", "Hall"),
    ),
    "german": (
        ("Lukas", "Anna", "Felix", "Laura", "Jonas", "Lea", "Maximilian", "Sophie", "Paul", "Marie"),
        ("Schmidt", "Mueller", "Weber", "Fischer", "Wagner", "Becker", "Hoffmann", "Schaefer", "Koch", "Richter"),
    ),
    "french": (
        ("Louis", "Emma", "Hugo", "Lea", "Gabriel", "Chloe", "Arthur", "Manon", "Jules", "Camille"),
        ("Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Durand", "Leroy", "Moreau", "Simon"),
    ),
    "dutch": (
        ("Daan", "Emma", "Sem", "Julia", "Lucas", "Tess", "Finn", "Sanne", "Luuk", "Fleur"),
        ("de Jong", "Jansen", "de Vries", "van den Berg", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder"),
    ),
    "indian": (
        ("Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Neha", "Arjun", "Kavya", "Rahul", "Isha"),
        ("Sharma", "Mehta", "Gupta", "Patel", "Reddy", "Iyer", "Nair", "Singh", "Kapoor", "Joshi"),
    ),
    "japanese": (
        ("Yuki", "Haruto", "Sakura", "Ren", "Hana", "Sota", "Aoi", "Kenji", "Mei", "Takumi"),
        ("Tanaka", "Sato", "Suzuki", "Takahashi", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato"),
    ),
    "singaporean": (
        ("Wei", "Jun", "Mei", "Hui", "Aisha", "Raj", "Daniel", "Rachel", "Kumar", "Siti"),
        ("Tan", "Lim", "Lee", "Ng", "Ong", "Wong", "Chua", "Goh", "Teo", "Koh"),
    ),
    "arabic": (
        ("Omar", "Fatima", "Khalid", "Layla", "Hassan", "Noor", "Yousef", "Mariam", "Ahmed", "Salma"),
        ("Al Mansoori", "Al Hashimi", "Haddad", "Khalil", "Nasser", "Saleh", "Mansour", "Farouk", "Aziz", "Rahman"),
    ),
    "brazilian": (
        ("Lucas", "Ana", "Gabriel", "Beatriz", "Pedro", "Julia", "Mateus", "Larissa", "Rafael", "Camila"),
        ("Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Rodrigues", "Almeida", "Lima", "Carvalho"),
    ),
}  # fmt: skip

COUNTRY_NAME_GROUP: dict[str, str] = {
    "US": "anglo", "CA": "anglo", "GB": "anglo", "AU": "anglo",
    "DE": "german", "FR": "french", "NL": "dutch",
    "IN": "indian", "JP": "japanese", "SG": "singaporean",
    "AE": "arabic", "BR": "brazilian",
}  # fmt: skip
