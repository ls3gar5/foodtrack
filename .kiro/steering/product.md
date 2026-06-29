# Product Overview

FoodTrack is a food tracking application.


## Purpose
Help users track their food intake, nutrition, or related food data (exact scope to be defined).

Provides the UI for the checkout flow where users select payment methods, confirm payments, and receive feedback (success, error, account block). It supports multiple sellers/ecommerce integrations and handles deeplink fallbacks for the native app.

## Guidelines
Please organize, design, test, document and deploy (optional) your code as if it
were going into production, then send us a link to the hosted repository (e.g.
Github, Bitbucket...)

The UX/UI is totally up to you. If you like, get creative and add additional
features a user might find useful!

## Functional Spec
Create a service that tells the user what types of food trucks might be found
near a specific location on a map

The data is available on
https://data.sfgov.org/Economy-and-Community/Mobile-Food-Facility-Permit/rqzj-sfat/data_preview

## Technical Spec

The architecture will be split between a back-end and a web front-end, for
instance providing a JSON in/out RESTful API. Feel free to use any other
technologies provided that the general client/service architecture is respected


## Key Flows

- **Checkout home**: Displays payment methods and order details
- **Confirmation**: Payment confirmation screen
- **Feedback**: Success/error/block result pages with seller-specific redirects
- **Fallback deeplink**: Redirects users to download the Personal Pay app when needed
- **CHAAS (Checkout AAS)**: Iframe-based checkout flow for Tienda Personal seller

## Deployment

- Environments: dev, qa, beta, prod
- CI/CD via GitHub CI using shared pipelines from ``

## Language

The UI is in Spanish (Argentina). All user-facing text is in Spanish.
