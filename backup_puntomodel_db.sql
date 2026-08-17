--
-- PostgreSQL database dump
--

\restrict vSWmC5eVcYdv6gBpMbc5lHqsEQd4Ku7gcAL0QBG1AZ26LeabGhfExCI4KuYN7qP

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg12+1)
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.comments (
    id text NOT NULL,
    model_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO saleday_user;

--
-- Name: events; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.events (
    id text NOT NULL,
    model_id text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO saleday_user;

--
-- Name: models; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.models (
    id text NOT NULL,
    email text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.models OWNER TO saleday_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    model_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO saleday_user;

--
-- Name: password_reset_requests; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.password_reset_requests (
    id text NOT NULL,
    email text NOT NULL,
    user_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    token text,
    token_sent_at timestamp with time zone
);


ALTER TABLE public.password_reset_requests OWNER TO saleday_user;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.payments (
    id text NOT NULL,
    model_id text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO saleday_user;

--
-- Name: registration_leads; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.registration_leads (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    phone_normalized text NOT NULL,
    status text DEFAULT 'started'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


ALTER TABLE public.registration_leads OWNER TO saleday_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: saleday_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO saleday_user;

--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.comments (id, model_id, data, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.events (id, model_id, type, created_at) FROM stdin;
\.


--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.models (id, email, data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.notifications (id, model_id, data, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: password_reset_requests; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.password_reset_requests (id, email, user_id, status, created_at, updated_at, resolved_at, token, token_sent_at) FROM stdin;
yg_rbwpLYCn2Rp-Lg1J8L	cristianeeichtalt3@gmail.com	\N	resolved	2026-02-17 18:47:27.812+00	2026-02-17 18:48:50.769+00	2026-02-17 18:48:50.769+00	247	\N
BPerNhefnmuda1o8BqoHa	laura123@hotmail.com	\N	resolved	2026-02-17 19:10:17.702+00	2026-02-17 19:11:40.26+00	2026-02-17 19:11:40.26+00	672	2026-02-17 19:11:25.361+00
WwhAS7ZvQaHn44XYaFfzD	laura123@hotmail.com	\N	resolved	2026-02-17 18:39:52.411+00	2026-02-17 18:40:52.958+00	2026-02-17 18:40:52.958+00	451	2026-02-17 18:40:10.798+00
3zU58Qr4hJyK3liwI_7G7	laura123@hotmail.com	\N	resolved	2026-02-17 18:40:52.959+00	2026-02-17 18:41:26.991+00	2026-02-17 18:41:26.991+00	409	\N
0lu9a5qZQlAPNexTixDH3	laura123@hotmail.com	\N	resolved	2026-02-17 19:30:55.775+00	2026-02-17 19:31:25.628+00	2026-02-17 19:31:25.628+00	085	\N
iETXIXDa_cYreYcVkZS9F	laura123@hotmail.com	\N	resolved	2026-02-17 19:36:40.201+00	2026-02-17 19:37:03.322+00	2026-02-17 19:37:03.322+00	208	\N
WnG9ypkW4GsqOu_53E7mo	laura123@hotmail.com	\N	resolved	2026-02-17 19:37:17.854+00	2026-02-17 19:37:34.253+00	2026-02-17 19:37:34.253+00	590	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.payments (id, model_id, data, created_at) FROM stdin;
\.


--
-- Data for Name: registration_leads; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.registration_leads (id, name, phone, phone_normalized, status, created_at, updated_at, completed_at) FROM stdin;
M5ctrAQhceVkZ5nDFR4lP	Rffff	(49) 9912-59242	+5549991259242	started	2026-02-13 15:21:39.654+00	2026-02-13 15:21:39.654+00	\N
_JAifiHE664xzIMa3CLay	Gisele Bündchen	(49) 9991-02	+5549999102	started	2026-02-13 15:39:58.095+00	2026-02-13 15:39:58.095+00	\N
Qo6vk6o_lVNfHxLoLPpsd	Gisele Bündchen	(49) 9991-02026	+5549999102026	started	2026-02-13 15:39:59.198+00	2026-02-13 15:39:59.198+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: saleday_user
--

COPY public.users (id, email, password_hash, name, role, created_at) FROM stdin;
\.


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: models models_email_key; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_email_key UNIQUE (email);


--
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_requests password_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: registration_leads registration_leads_phone_normalized_key; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.registration_leads
    ADD CONSTRAINT registration_leads_phone_normalized_key UNIQUE (phone_normalized);


--
-- Name: registration_leads registration_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.registration_leads
    ADD CONSTRAINT registration_leads_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: comments_model_id_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX comments_model_id_idx ON public.comments USING btree (model_id);


--
-- Name: events_model_id_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX events_model_id_idx ON public.events USING btree (model_id);


--
-- Name: notifications_model_id_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX notifications_model_id_idx ON public.notifications USING btree (model_id);


--
-- Name: password_reset_requests_status_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX password_reset_requests_status_idx ON public.password_reset_requests USING btree (status);


--
-- Name: password_reset_requests_updated_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX password_reset_requests_updated_idx ON public.password_reset_requests USING btree (updated_at DESC);


--
-- Name: payments_model_id_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX payments_model_id_idx ON public.payments USING btree (model_id);


--
-- Name: registration_leads_status_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX registration_leads_status_idx ON public.registration_leads USING btree (status);


--
-- Name: registration_leads_updated_idx; Type: INDEX; Schema: public; Owner: saleday_user
--

CREATE INDEX registration_leads_updated_idx ON public.registration_leads USING btree (updated_at DESC);


--
-- Name: comments comments_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- Name: events events_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- Name: password_reset_requests password_reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: saleday_user
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vSWmC5eVcYdv6gBpMbc5lHqsEQd4Ku7gcAL0QBG1AZ26LeabGhfExCI4KuYN7qP

