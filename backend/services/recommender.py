"""
Recommendation engine for water quality analysis.

Each rule evaluates actual parameter values and returns a structured
recommendation object with a specific, actionable suggestion.
Rules are ordered by severity and extensible — add new entries to RULES.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable


# ─────────────────────────────────────────────────────────────────────────────
# Data model
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Recommendation:
    parameter:   str            # parameter that triggered this
    severity:    str            # "critical" | "warning" | "info"
    issue:       str            # short description of what is wrong
    value:       float          # actual measured value
    unit:        str            # unit of measurement
    threshold:   str            # threshold reference shown to user
    action:      str            # specific treatment/action to take
    icon:        str            # icon key for frontend (beaker, droplets, etc.)


# ─────────────────────────────────────────────────────────────────────────────
# Rule definition
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Rule:
    parameter:   str
    condition:   Callable[[float], bool]    # returns True if issue exists
    severity:    str
    issue_fn:    Callable[[float], str]     # generates issue description from value
    threshold:   str
    action:      str
    unit:        str
    icon:        str


# ─────────────────────────────────────────────────────────────────────────────
# Rule registry
# Each rule checks one parameter and generates a specific recommendation.
# Add new rules here — no other code needs to change.
# ─────────────────────────────────────────────────────────────────────────────

RULES: list[Rule] = [

    # ── pH ──────────────────────────────────────────────────────────────────
    Rule(
        parameter  = "ph",
        condition  = lambda v: v < 6.5,
        severity   = "critical",
        issue_fn   = lambda v: f"pH is acidic at {v:.2f} (safe range: 6.5–8.5)",
        threshold  = "6.5–8.5",
        action     = (
            "Add lime (calcium hydroxide) or soda ash (sodium carbonate) "
            "to raise pH. Install a calcite neutralizing filter or "
            "a chemical dosing system for sustained correction."
        ),
        unit  = "pH",
        icon  = "beaker",
    ),
    Rule(
        parameter  = "ph",
        condition  = lambda v: v > 8.5,
        severity   = "warning",
        issue_fn   = lambda v: f"pH is alkaline at {v:.2f} (safe range: 6.5–8.5)",
        threshold  = "6.5–8.5",
        action     = (
            "Inject CO₂ or dilute food-grade muriatic acid (hydrochloric acid) "
            "to lower pH. Consider a carbon dioxide injection system for "
            "large-scale treatment."
        ),
        unit  = "pH",
        icon  = "beaker",
    ),

    # ── Turbidity ────────────────────────────────────────────────────────────
    Rule(
        parameter  = "Turbidity",
        condition  = lambda v: v > 10.0,
        severity   = "critical",
        issue_fn   = lambda v: f"Turbidity is very high at {v:.2f} NTU (limit: 4 NTU)",
        threshold  = "< 4 NTU",
        action     = (
            "Apply coagulation and flocculation treatment (e.g., alum or "
            "ferric chloride), followed by sedimentation and multi-layer "
            "filtration (sand + activated carbon). Retest before any use."
        ),
        unit  = "NTU",
        icon  = "droplets",
    ),
    Rule(
        parameter  = "Turbidity",
        condition  = lambda v: 4.0 < v <= 10.0,
        severity   = "warning",
        issue_fn   = lambda v: f"Turbidity is elevated at {v:.2f} NTU (limit: 4 NTU)",
        threshold  = "< 4 NTU",
        action     = (
            "Install a sediment pre-filter (5–10 µm) followed by a sand "
            "or multimedia filter. Regular backwashing required. "
            "UV disinfection is recommended as a secondary step."
        ),
        unit  = "NTU",
        icon  = "droplets",
    ),

    # ── Chloramines ──────────────────────────────────────────────────────────
    Rule(
        parameter  = "Chloramines",
        condition  = lambda v: v > 4.0,
        severity   = "warning",
        issue_fn   = lambda v: f"Chloramine level is {v:.2f} mg/L (WHO limit: 4 mg/L)",
        threshold  = "< 4 mg/L",
        action     = (
            "Install a granular activated carbon (GAC) or catalytic carbon "
            "filter — these are specifically effective against chloramines "
            "unlike standard carbon blocks. Replace filter media every 6–12 months."
        ),
        unit  = "mg/L",
        icon  = "beaker",
    ),

    # ── Sulfate ──────────────────────────────────────────────────────────────
    Rule(
        parameter  = "Sulfate",
        condition  = lambda v: v > 250.0,
        severity   = "warning",
        issue_fn   = lambda v: f"Sulfate is {v:.1f} mg/L (WHO limit: 250 mg/L)",
        threshold  = "< 250 mg/L",
        action     = (
            "Use a reverse osmosis (RO) system or ion exchange (anion resin) "
            "to reduce sulfate. Nanofiltration membranes are also effective. "
            "Blending with a low-sulfate source is an alternative."
        ),
        unit  = "mg/L",
        icon  = "zap",
    ),

    # ── Total Dissolved Solids (Solids) ──────────────────────────────────────
    Rule(
        parameter  = "Solids",
        condition  = lambda v: v > 1000.0,
        severity   = "critical",
        issue_fn   = lambda v: f"TDS is very high at {v:,.0f} mg/L (guideline: < 500 mg/L)",
        threshold  = "< 500 mg/L",
        action     = (
            "Deploy a reverse osmosis (RO) or electrodialysis system. "
            "For industrial sources, zero-liquid-discharge (ZLD) treatment "
            "may be required. Identify and eliminate the contamination source."
        ),
        unit  = "mg/L",
        icon  = "droplets",
    ),
    Rule(
        parameter  = "Solids",
        condition  = lambda v: 500.0 < v <= 1000.0,
        severity   = "warning",
        issue_fn   = lambda v: f"TDS is elevated at {v:,.0f} mg/L (guideline: < 500 mg/L)",
        threshold  = "< 500 mg/L",
        action     = (
            "Install a reverse osmosis (RO) filter or a distillation unit. "
            "A high-quality nanofiltration membrane can also reduce dissolved "
            "solids effectively."
        ),
        unit  = "mg/L",
        icon  = "droplets",
    ),

    # ── Organic Carbon ───────────────────────────────────────────────────────
    Rule(
        parameter  = "Organic_carbon",
        condition  = lambda v: v > 10.0,
        severity   = "warning",
        issue_fn   = lambda v: f"Organic carbon (TOC) is {v:.2f} mg/L (guideline: < 10 mg/L)",
        threshold  = "< 10 mg/L",
        action     = (
            "Apply activated carbon adsorption (GAC beds) to remove organic "
            "compounds. High TOC can react with disinfectants to form harmful "
            "by-products — pair with advanced oxidation (ozone or UV/H₂O₂) "
            "for thorough removal."
        ),
        unit  = "mg/L",
        icon  = "activity",
    ),

    # ── Trihalomethanes ──────────────────────────────────────────────────────
    Rule(
        parameter  = "Trihalomethanes",
        condition  = lambda v: v > 80.0,
        severity   = "critical",
        issue_fn   = lambda v: f"Trihalomethanes (THMs) are {v:.1f} µg/L (WHO limit: 80 µg/L)",
        threshold  = "< 80 µg/L",
        action     = (
            "Install a granular activated carbon (GAC) filter — the most "
            "effective method for THM removal. Reduce source chlorine dose "
            "if THMs are disinfection by-products. Aeration (packed tower "
            "or spray aeration) can also strip volatile THMs."
        ),
        unit  = "µg/L",
        icon  = "thermometer",
    ),

    # ── Hardness ─────────────────────────────────────────────────────────────
    Rule(
        parameter  = "Hardness",
        condition  = lambda v: v > 300.0,
        severity   = "info",
        issue_fn   = lambda v: f"Water hardness is {v:.1f} mg/L (recommended: < 300 mg/L)",
        threshold  = "< 300 mg/L",
        action     = (
            "Install a cation exchange water softener (sodium or potassium "
            "cycle) to replace calcium and magnesium ions. Alternatively, "
            "use a lime softening process for municipal-scale treatment."
        ),
        unit  = "mg/L",
        icon  = "activity",
    ),

    # ── Conductivity ─────────────────────────────────────────────────────────
    Rule(
        parameter  = "Conductivity",
        condition  = lambda v: v > 400.0,
        severity   = "info",
        issue_fn   = lambda v: f"Conductivity is {v:.1f} µS/cm (guideline: < 400 µS/cm)",
        threshold  = "< 400 µS/cm",
        action     = (
            "High conductivity indicates elevated dissolved ions. Investigate "
            "potential industrial or agricultural runoff. Apply RO or "
            "electrodialysis reversal (EDR) to reduce ionic load."
        ),
        unit  = "µS/cm",
        icon  = "zap",
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

_SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


def generate_recommendations(
    features: dict[str, float],
    prediction: str,
    confidence: float,
) -> list[dict]:
    """
    Evaluate each water parameter against rule thresholds using actual values.
    Returns a sorted list of recommendation dicts (critical first).

    Args:
        features:   dict of 9 parameter names → float values
        prediction: "Safe" or "Unsafe" from ML model
        confidence: model confidence probability

    Returns:
        List of serialisable recommendation dicts, sorted by severity.
    """
    triggered: list[Recommendation] = []

    for rule in RULES:
        value = features.get(rule.parameter)
        if value is None:
            continue
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        if rule.condition(value):
            triggered.append(Recommendation(
                parameter = rule.parameter,
                severity  = rule.severity,
                issue     = rule.issue_fn(value),
                value     = round(value, 3),
                unit      = rule.unit,
                threshold = rule.threshold,
                action    = rule.action,
                icon      = rule.icon,
            ))

    # Sort: critical → warning → info, then by parameter name for stability
    triggered.sort(key=lambda r: (_SEVERITY_ORDER.get(r.severity, 9), r.parameter))

    # If water is Safe and no issues found, add a positive confirmation
    if not triggered and prediction == "Safe":
        triggered.append(Recommendation(
            parameter = "overall",
            severity  = "info",
            issue     = "All parameters are within WHO safe limits",
            value     = confidence,
            unit      = "confidence",
            threshold = "all within limits",
            action    = (
                "Water appears safe for drinking. Continue regular monitoring "
                "every 3–6 months. Maintain source protection and treatment "
                "system to sustain water quality."
            ),
            icon = "shield-check",
        ))

    return [
        {
            "parameter": r.parameter,
            "severity":  r.severity,
            "issue":     r.issue,
            "value":     r.value,
            "unit":      r.unit,
            "threshold": r.threshold,
            "action":    r.action,
            "icon":      r.icon,
        }
        for r in triggered
    ]
