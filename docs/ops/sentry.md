# Sentry

**Status:** Active  
**Owner:** Engineering  
**Last updated:** July 29, 2026  
**Related:** [Ops](./README.md) · [Testing guide](../qa/testing-guide.md) · [Report a Problem](../qa/report-a-problem.md) · [Documentation home](../README.md)

## Purpose

Sentry project setup, privacy-first config, triage, and how in-app Report a Problem maps to issues.

## Report a Problem implementation

The signed-in app provides its own React **Report a Problem** dialog and sends
feedback with `Sentry.captureFeedback`. Do not enable Sentry's auto-injected
Feedback widget: it adds a separate DOM/Preact surface and is not required for
manual reports or optional screenshots.
