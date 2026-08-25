# Property Scout — Voice-First AI Property Scout

## Objective
Build a voice-first AI property scout that understands a renter or buyer's spoken preferences, shortlists real listings, explains its shortlist decisions, and books a site-visit call, all grounded in real neighborhood data.

## Problem Statement
People don't struggle to find listings. They struggle to judge whether a listing actually fits their life: is the commute realistic, is the area safe at night, is it worth the extra rent for the extra room.

Your task is to build a voice-based AI assistant that:
*   Collects preferences conversationally (budget, bedrooms, must-haves, commute point)
*   Shortlists listings scraped from a real public source that match those preferences
*   Grounds every neighborhood claim (safety, amenities, transit) in real public sources, not the model's general knowledge
*   Allows the user to refine the shortlist using voice commands
*   Explains why each listing was picked or dropped
*   Books a site-visit slot via voice once the user has a shortlist they like
*   Along with the above, implement an n8n workflow that compiles the shortlist into a PDF and emails it to the user.

---

## What You Will Build
A deployed voice-mode property scout with a minimal companion UI.

### Core Capabilities (Required)

#### 1. Voice-Based Preference Collection
The assistant must support spoken inputs like:
> "I'm looking for a 2BHK in Koramangala, budget 35k, need parking, close to a metro station."

Ask clarifying questions only when required (max 5). Confirm constraints before generating the shortlist.

#### 2. Voice-Based Shortlist Refinement
The user must be able to modify the shortlist using voice commands:
*   *"Drop anything above 40k."*
*   *"Only show me places within 15 minutes of a metro station."*
*   *"I need something pet-friendly."*
*   *"Add one more option with a balcony."*

Only the affected part of the shortlist should change.

#### 3. Explanation & Reasoning
The assistant must answer questions such as:
*   *"Why did you pick this one?"*
*   *"Is the commute from here realistic?"*
*   *"What's this area actually like to live in?"*

Explanations must be grounded, not generic.

---

## Companion UI & Agent Experience

Your UI can be simple, but must support a dual-mode **Agent Portal** with two primary tabs: **Buy** and **Sell**.

### 1. Buy Tab (Rental Discovery & Exploration)
*   **User Journey**: The agent selects the **Buy** tab to browse properties currently available for rent for their clients. They can explore the inventory, review details, and easily shortlist suitable properties to prepare them for the voice-based refinement workflow.
*   **Key Actions**:
    *   Browse and scroll through available rental listings.
    *   Select and shortlist candidate listings for refinement.
    *   View specific neighborhood data and commute details.
*   **Information Displayed & Required**:
    *   Property Location (area, neighborhood context).
    *   Price/Rent (monthly cost).
    *   Property Type (e.g., BHK, square footage).
    *   Availability status (only showing active rental listings).
*   **Required Core Elements**:
    *   **Shortlist cards** containing rent, bedrooms, area, and key amenities.
    *   **A neighborhood snapshot panel** per listing displaying transit points, safety notes, and nearby amenities sourced via OpenStreetMap MCP.
    *   **A microphone button + live transcript** to allow voice commands (e.g., refinement commands, explanation requests).
    *   **A "Sources" or "References" section** citing exact RAG/web sources for neighborhood claims.
    *   **A visit-confirmation panel** displaying the booking slot and verification code when scheduling a site visit.
*   **Expected Outcome**: The agent successfully compiles a preliminary shortlist of properties that matches the buyer's criteria, ready for voice-driven refinement and explanation.

### 2. Sell Tab (Guided Property Listing Flow)
*   **User Journey**: The agent selects the **Sell** tab and is guided through a step-by-step listing process to put a new property up for sale on the platform.
*   **Key Actions**:
    *   Initiate listing process by clicking "Add Property".
    *   Follow a structured, progressive step-by-step form to input listing parameters.
    *   Submit the completed listing details.
*   **Information Required at Each Step**:
    *   *Step 1: Property Metadata*: Select property type (Apartment, House, Condo) and BHK configuration.
    *   *Step 2: Location Details*: Provide physical address, city, and neighborhood location (with coordinates).
    *   *Step 3: Listing Terms*: Enter the expected sale price.
    *   *Step 4: Media Upload*: Upload property photos and optional virtual tour links.
    *   *Step 5: Contact Details & Permissions*: Provide listing details while ensuring any PII is stripped/anonymized before database logging or public indexing.
*   **Guidance & Expected Outcome**: 
    *   The UI must display clear instructions on how the property will be listed (e.g., validation steps, RAG vector database ingestion).
    *   Upon submission, the agent must see a completion screen explaining what happens next: the listing is processed, PII checks are run, coordinates are verified, and matching alerts are generated for buyers active in the "Buy" mode.

### 3. Footer & Navigation Section
*   **User Journey**: Placed clearly at the bottom of the application, the footer provides agents/users with non-intrusive, quick access to static informational, support, and legal resources without interrupting the primary Buy/Sell transaction experiences.
*   **Key Actions**:
    *   Navigate to secondary pages/views via clickable links.
    *   Find support contact detail information.
    *   Review legal agreements and platform FAQs.
*   **Links & Respective Content**:
    *   **About Us**: Explains the Property Scout platform's purpose, background, voice-first search features, and product offerings.
    *   **Contact Us**: Lists support team coordinates, contact email addresses, and an inquiry form.
    *   **Terms & Conditions**: Accesses the legal rules governing platform usage, listings ownership, and user responsibilities.
    *   **Privacy Policy**: Outlines user data collection, PII sanitization procedures, cookies, and data retention rules.
    *   **FAQs**: Addresses frequently asked questions regarding search filters, OSM integrations, site visit bookings, and email reports.
*   **UI & Styling Expectations**:
    *   *Placement*: Positioned at the extreme bottom of the page.
    *   *Design*: Simple, clean layout using subtle colors that blend into the primary interface without distracting from the Buy/Sell workflows.
    *   *Interactivity*: Responsive layout with clear hover states and quick transitions.
    *   *Trust & Legality*: Professional visual hierarchy (particularly for the Privacy Policy and Terms & Conditions links) to ensure credibility and compliance.
    *   *Responsiveness*: Designed to stack neatly or scale appropriately on mobile, tablet, and desktop viewports.
*   **Expected Outcome**: The user receives a complete, trustworthy, and legally transparent product experience that handles user inquiries and documentation access seamlessly.

---
---

## Data Requirements
*   **Listings**: Rent, bedrooms, furnishing, amenities, society name, square footage, and availability status can be generated from [Bengaluru Rent](https://bengaluru.rent/). See MCP Integration below for a tool that can help with this, though it isn't required.
    *   *Note*: Not every pin on Bengaluru Rent is an active listing. Some are pinned by residents purely for rent transparency and are explicitly marked "Not for rent." Only pins marked as currently available should go into your working set; transparency-only pins are excluded.
*   **PII Filtering**: Remove any PII like owner or agent contact details (names, phone numbers) from whatever you scrape before it touches your dataset, UI, or logs.
*   **Amenities and Transit**: Nearby amenities and transit points should come from the OpenStreetMap MCP, since that's structured, queryable geodata, not something to guess.
*   **Neighborhood Guidance**: Neighborhood practical guidance (safety notes, what an area is actually like) must also come from real public sources, for example neighborhood or city guide pages on Wikipedia or similar open sources, gathered the same way you gather listings.

### Data Rules
1. Listings must map back to what you scraped and must be currently available, not just pinned for reference.
2. No PII (names, phone numbers) anywhere in your dataset, UI, or logs.
3. Amenities and transit claims must come from the OpenStreetMap MCP.
4. Neighborhood character claims must come from RAG sources with citations.
5. If listing, amenity, or neighborhood data is missing or unreliable, the system must say so, not guess.

---

## MCP Integration
Your system must integrate MCP server in the orchestration layer. You are not required to build an MCP server from scratch; the skill being tested is wiring a real tool into an agent, not writing MCP boilerplate. Your own ranking or shortlist logic can live in your application code and call this tool as needed.

### Required MCP Tool
| Tool | Link | Use it for |
| :--- | :--- | :--- |
| **OpenStreetMap MCP** | [GitHub Repo](https://github.com/jagan-shanmugam/open-streetmap-mcp) | Nearby amenities, transit points, and POI data around a listing's location |

You must demonstrate the required MCP call clearly in your demo.

---

## RAG Integration & Retrieval Policy

### 1. Knowledge Base Files
Integrate the following local files as the Property Scout's RAG knowledge base:
*   [README.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/RAG/README.md) (broad metadata and guidelines)
*   [sources.jsonl](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/RAG/sources.jsonl) (source description catalog)
*   [localities.jsonl](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/RAG/localities.jsonl) (locality profile records)
*   [safety_sources.jsonl](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/RAG/safety_sources.jsonl) (public safety records)

Index the locality and safety content for semantic retrieval while preserving the source metadata and source IDs so that every retrieved claim can be traced back to its original source. Do not invent source URLs, source content, locality facts, or safety information during ingestion.

### 2. Separation of Responsibilities
*   **bengaluru.rent**: Current property / listing availability and terms.
*   **RAG**: Verified neighborhood context, history, development, and source-backed explanations.
*   **Safety sources**: Source-backed crime/safety evidence (where available).
*   **OpenStreetMap MCP**: Current POIs, amenities, transit landmarks, and geographic relationships (distances/times).

*The LLM must not substitute its general knowledge for missing information from any of these sources.*

### 3. RAG Retrieval Policy
1.  **Retrieval Triggers**: Retrieve locality context from RAG *only* when the user asks about:
    *   Neighborhood character
    *   Background, development, or history
    *   Neighborhood-level guidance
    *   Source-backed explanations or justifications for shortlist decisions
2.  **No Listing/Price Inferences**: Never use RAG as the source of truth for current property listings, prices, or rent.
3.  **No Distance Inferences**: Never use RAG to calculate exact distances. Use the **OpenStreetMap MCP** instead for:
    *   Metro stations & transit points
    *   Restaurants & parks
    *   Hospitals & schools
    *   Other points of interest (POIs)
    *   *Example*: If a user asks "How far is this property from the metro?", use the OSM MCP capability instead of answering from RAG.
4.  **Neighborhood Query Handling**: If a user asks "What is Koramangala like?", retrieve relevant information from the RAG vector database and provide corresponding citations.
5.  **Safety Query Handling**: If a user asks "Is Koramangala safe?", retrieve available safety evidence from `RAG/safety_sources.jsonl`.
    *   **CRITICAL RULE**: Do NOT produce a binary "safe" or "unsafe" rating unless the retrieved evidence explicitly supports such a conclusion.
    *   If sufficient verified evidence does not exist, explicitly state that *sufficient verified information is unavailable*.
6.  **No Locality Extrapolation**: Never infer a fact about one locality merely because the same fact exists for another locality. Do not fabricate, extrapolate, or fill missing neighborhood information using the LLM's general knowledge.
7.  **Conflicting Evidence**: When retrieved sources disagree, do not silently choose one. Surface the uncertainty/disagreement to the user and cite all relevant conflicting sources.
8.  **Source Preservation**: Preserve all source metadata during vector ingestion, including:
    *   Source ID
    *   Source name
    *   Source type
    *   Source URL (where available)
    *   Verification date

### 4. Grounding & UI Citations
*   **Grounding Requirement**: Before returning a neighborhood-related factual answer, verify that the answer can be fully supported by retrieved RAG content. If it cannot be supported, respond transparently that *verified information is unavailable* rather than guessing.
*   **UI Citation Requirement**: Display a "Sources" or "References" section containing the sources actually used to generate the response. The citation shown to the user must correspond to the retrieved source metadata. Never cite a source that was not actually retrieved or used to support the response.

### 5. Ingestion & Search Pipeline Implementation
The RAG pipeline must be implemented directly in the existing Property Scout architecture:
1.  Load the four knowledge-base files (`RAG/README.md`, `RAG/sources.jsonl`, `RAG/localities.jsonl`, `RAG/safety_sources.jsonl`).
2.  Parse and validate the JSONL / Markdown records.
3.  Generate embeddings for searchable content.
4.  Store embeddings in the project's vector database, preserving source metadata with every vector chunk.
5.  Retrieve relevant chunks based on user query and pass them to the LLM.
6.  Return source metadata alongside the response to allow the UI to render citations.

---

## AI Evaluations
You must implement at least three evaluation checks:

### 1. Feasibility Eval
*   Shortlist respects stated budget and must-haves.
*   Commute claims are internally consistent with stated commute point.

### 2. Edit Correctness Eval
*   Voice edits only modify intended parts of the shortlist.
*   No unintended changes elsewhere.

### 3. Grounding & Hallucination Eval
*   Listings map to dataset records and are marked as currently available.
*   Neighborhood claims cite RAG sources.
*   Uncertainty is explicitly stated when neighborhood data is missing.

*Note: Evals can be rule-based or LLM-assisted but must be runnable.*

---

## Tech & Deployment Requirements
*   Build using LLM APIs
*   Voice input (speech-to-text required)
*   Version control using git
*   Deployed prototype (public URL)
