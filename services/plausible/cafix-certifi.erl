%% STOPGAP eMudhra CA (2026-10-22): drop together with Dockerfile.cafix.
%% Replaces the certifi 2.15.0 module in the Plausible release. The upstream
%% module compiles its Mozilla bundle (incl. "emSign ECC Root CA - G3") into the
%% .beam, and hackney uses certifi:cacerts() by default (tzdata autoupdate,
%% ReferrerBlocklist/HTTPoison, Sentry, ua/ref_inspector downloaders).
%% This version returns the OS store (the patched Alpine bundle) instead.
-module(certifi).
-export([cacertfile/0, cacerts/0]).
cacertfile() -> filename:join(code:priv_dir(certifi), "cacerts.pem").
cacerts() -> [Der || {cert, Der, _Otp} <- public_key:cacerts_get()].
