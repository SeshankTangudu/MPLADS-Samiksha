# -*- coding: utf-8 -*-
"""
Automated Test for Multilingual UI Completeness and Key Parity
Verifies:
1. All 6 language dictionaries (en, hi, bn, te, mr, ta) exist in frontend/src/i18n/locales/
2. 100% key parity with canonical English dictionary
3. No empty strings or missing translation values
4. Non-English translations contain non-empty, distinct local language strings
"""

import json
import re
import os
import pytest

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "i18n", "locales")
LANGUAGES = ['en', 'hi', 'bn', 'te', 'mr', 'ta']

def load_locale(lang):
    filepath = os.path.join(LOCALES_DIR, f"{lang}.js")
    assert os.path.exists(filepath), f"Locale file {filepath} does not exist!"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    # Extract JSON-like object from JS export
    match = re.search(r'export const \w+\s*=\s*(\{.*\});', content, re.DOTALL)
    assert match, f"Could not parse dictionary export from {filepath}"
    return json.loads(match.group(1))

def flatten_dict(d, prefix=""):
    flat = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            flat.update(flatten_dict(v, key))
        else:
            flat[key] = v
    return flat

def test_all_locales_exist_and_parse():
    for lang in LANGUAGES:
        data = load_locale(lang)
        assert isinstance(data, dict)
        assert len(data) > 0

def test_100_percent_key_parity():
    en_dict = load_locale('en')
    en_flat = flatten_dict(en_dict)
    
    assert len(en_flat) >= 500, f"Expected at least 500 translation keys, found {len(en_flat)}"
    
    for lang in ['hi', 'bn', 'te', 'mr', 'ta']:
        lang_dict = load_locale(lang)
        lang_flat = flatten_dict(lang_dict)
        
        missing_keys = set(en_flat.keys()) - set(lang_flat.keys())
        extra_keys = set(lang_flat.keys()) - set(en_flat.keys())
        
        assert len(missing_keys) == 0, f"Language '{lang}' is missing {len(missing_keys)} keys: {missing_keys}"
        assert len(extra_keys) == 0, f"Language '{lang}' has {len(extra_keys)} extra keys: {extra_keys}"
        assert len(lang_flat) == len(en_flat), f"Key count mismatch for '{lang}' ({len(lang_flat)} vs {len(en_flat)})"

def test_no_empty_translations():
    for lang in LANGUAGES:
        lang_dict = load_locale(lang)
        lang_flat = flatten_dict(lang_dict)
        for key, val in lang_flat.items():
            assert isinstance(val, str), f"Key '{key}' in '{lang}' must be a string, got {type(val)}"
            assert val.strip() != "", f"Key '{key}' in '{lang}' is empty!"

def test_distinct_non_english_content():
    en_dict = load_locale('en')
    en_flat = flatten_dict(en_dict)
    
    for lang in ['hi', 'bn', 'te', 'mr', 'ta']:
        lang_dict = load_locale(lang)
        lang_flat = flatten_dict(lang_dict)
        
        # Test core high-visibility keys have native non-English text
        core_test_keys = [
            "nav.overview",
            "nav.dashboard",
            "nav.explorer",
            "nav.anomalies",
            "nav.map",
            "nav.analytics",
            "nav.methodology",
            "common.search",
            "common.filter",
            "common.investigate",
            "landing.hero_title",
            "overview.hero_title",
            "report.title",
            "track.title"
        ]
        
        for k in core_test_keys:
            en_val = en_flat[k]
            lang_val = lang_flat[k]
            assert lang_val != en_val, f"Key '{k}' in language '{lang}' was not translated (equals English '{en_val}')"
