# Property Scout — Bengaluru RAG Knowledge Base

Version: 1.0
Verified: 2026-08-09

## Purpose

This knowledge base provides source-backed, relatively stable neighborhood
context for the Property Scout AI agent.

It is designed to complement live property/listing data from bengaluru.rent
and live geographic information from OpenStreetMap MCP.

## What belongs here

- Neighborhood location/context
- Broad neighborhood character
- Historical/development context
- Source-backed geographic relationships
- Carefully sourced public safety context where available
- Other relatively stable contextual information

## What does NOT belong here

Do not use this knowledge base as the source of truth for:

- Current rental prices
- Current property availability
- Current property listings
- Exact distance to a metro station
- Exact distance to amenities
- Current restaurant/shop/hospital availability
- Current traffic conditions
- Current metro operating status
- Subjective safety ratings
- "Best area" rankings
- Family-friendly/safe/nightlife claims unless explicitly supported by
  an appropriate source

## Source hierarchy

1. Official government/public datasets
2. Official Bengaluru civic/transport sources
3. Established public reference sources
4. Other reputable sources used for corroboration

Wikipedia is used primarily for broad locality/history/development context,
not as the sole authority for time-sensitive claims.

## Architecture

bengaluru.rent
    |
    +--> Current rental/listing information

RAG
    |
    +--> Neighborhood context
    +--> Historical/development context
    +--> Source-backed explanations

OpenStreetMap MCP
    |
    +--> POIs
    +--> Amenities
    +--> Transit
    +--> Geographic relationships
    +--> Distance/routing where supported

## Grounding rule

Every factual neighborhood claim returned from RAG must have a source.

If no reliable source supports a claim, the agent must not invent one.

Preferred response:

"I don't have enough verified information to make that claim."

rather than:

"This area is probably safe."

## Citation rule

Each retrieved document contains source IDs.

The application should resolve those IDs to the URLs stored in
RAG/sources.jsonl and display the sources in the UI.

## Important

The locality records are deliberately conservative.

A locality being present in this database does NOT mean the system has
verified every possible fact about that locality.

Absence of evidence must not be converted into a positive or negative claim.