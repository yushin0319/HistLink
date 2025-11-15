--
-- PostgreSQL database dump
--

\restrict UwfBNlI3eY8JHKFaymeY9sDjp9blRgAbAbbd9Y0yJOfOIxUn8kIZj9EwOJcdKRm

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_games_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_games_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id bigint NOT NULL,
    current_step integer DEFAULT 0 NOT NULL,
    lives integer DEFAULT 3 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    chain_count integer DEFAULT 0 NOT NULL,
    is_finished boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT games_chain_count_check CHECK ((chain_count >= 0)),
    CONSTRAINT games_current_step_check CHECK ((current_step >= 0)),
    CONSTRAINT games_lives_check CHECK (((lives >= 0) AND (lives <= 5))),
    CONSTRAINT games_score_check CHECK ((score >= 0))
);


--
-- Name: relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relations (
    id integer NOT NULL,
    src_id integer NOT NULL,
    dst_id integer NOT NULL,
    relation_type character varying(50) NOT NULL,
    keyword character varying(100),
    explanation text
);


--
-- Name: relations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relations_id_seq OWNED BY public.relations.id;


--
-- Name: route_distractors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_distractors (
    route_id bigint NOT NULL,
    step_no integer NOT NULL,
    term_id bigint NOT NULL
);


--
-- Name: TABLE route_distractors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.route_distractors IS '各ステップの不正解候補（事前生成）';


--
-- Name: COLUMN route_distractors.step_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_distractors.step_no IS '対象ステップ';


--
-- Name: COLUMN route_distractors.term_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_distractors.term_id IS 'ダミー用語ID（正解とは繋がっていない）';


--
-- Name: route_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_steps (
    route_id bigint NOT NULL,
    step_no integer NOT NULL,
    term_id bigint,
    from_relation_type text
);


--
-- Name: TABLE route_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.route_steps IS 'ルートの各ステップ（一本道）';


--
-- Name: COLUMN route_steps.step_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_steps.step_no IS 'ステップ番号（0始まり）';


--
-- Name: COLUMN route_steps.term_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_steps.term_id IS 'このステップの用語ID';


--
-- Name: COLUMN route_steps.from_relation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.route_steps.from_relation_type IS '直前のステップとの関係種別';


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routes (
    id bigint NOT NULL,
    name text,
    start_term_id bigint NOT NULL,
    length integer NOT NULL,
    difficulty text,
    relation_filter text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE routes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.routes IS '事前生成されたゲームルート';


--
-- Name: COLUMN routes.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.routes.name IS 'ルート名（任意）';


--
-- Name: COLUMN routes.start_term_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.routes.start_term_id IS 'スタート用語';


--
-- Name: COLUMN routes.length; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.routes.length IS 'ルートの長さ（ステップ数）';


--
-- Name: COLUMN routes.difficulty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.routes.difficulty IS '難易度';


--
-- Name: COLUMN routes.relation_filter; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.routes.relation_filter IS '使用するリレーション種別';


--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.routes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    era character varying(50) NOT NULL,
    year integer,
    tags jsonb DEFAULT '[]'::jsonb
);


--
-- Name: terms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.terms_id_seq OWNED BY public.terms.id;


--
-- Name: v_route_quality; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_route_quality AS
 SELECT r.id AS route_id,
    r.name AS route_name,
    r.length,
    r.difficulty,
    count(DISTINCT rs.term_id) AS unique_terms,
    count(DISTINCT rd.term_id) AS total_distractors,
        CASE
            WHEN (count(DISTINCT rs.term_id) = r.length) THEN 'OK'::text
            ELSE 'NG'::text
        END AS uniqueness_check,
        CASE
            WHEN (count(DISTINCT rd.term_id) >= (3 * (r.length - 1))) THEN 'OK'::text
            ELSE 'NG'::text
        END AS distractor_check
   FROM ((public.routes r
     LEFT JOIN public.route_steps rs ON ((rs.route_id = r.id)))
     LEFT JOIN public.route_distractors rd ON ((rd.route_id = r.id)))
  GROUP BY r.id, r.name, r.length, r.difficulty
  ORDER BY r.id;


--
-- Name: VIEW v_route_quality; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_route_quality IS 'ルートの品質チェック（重複・ダミー数）';


--
-- Name: relations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relations ALTER COLUMN id SET DEFAULT nextval('public.relations_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms ALTER COLUMN id SET DEFAULT nextval('public.terms_id_seq'::regclass);


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: relations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: route_distractors; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: route_steps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: routes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: terms; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: relations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.relations_id_seq', 714, true);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.routes_id_seq', 13, true);


--
-- Name: terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.terms_id_seq', 1, false);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: relations relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_pkey PRIMARY KEY (id);


--
-- Name: route_distractors route_distractors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_distractors
    ADD CONSTRAINT route_distractors_pkey PRIMARY KEY (route_id, step_no, term_id);


--
-- Name: route_steps route_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_steps
    ADD CONSTRAINT route_steps_pkey PRIMARY KEY (route_id, step_no);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: idx_games_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_created_at ON public.games USING btree (created_at DESC);


--
-- Name: idx_games_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_route_id ON public.games USING btree (route_id);


--
-- Name: idx_relations_dst; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relations_dst ON public.relations USING btree (dst_id);


--
-- Name: idx_relations_src; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relations_src ON public.relations USING btree (src_id);


--
-- Name: games games_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_games_updated_at();


--
-- Name: games games_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: relations relations_dst_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_dst_id_fkey FOREIGN KEY (dst_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: relations relations_src_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_src_id_fkey FOREIGN KEY (src_id) REFERENCES public.terms(id) ON DELETE CASCADE;


--
-- Name: route_distractors route_distractors_route_id_step_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_distractors
    ADD CONSTRAINT route_distractors_route_id_step_no_fkey FOREIGN KEY (route_id, step_no) REFERENCES public.route_steps(route_id, step_no) ON DELETE CASCADE;


--
-- Name: route_steps route_steps_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_steps
    ADD CONSTRAINT route_steps_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UwfBNlI3eY8JHKFaymeY9sDjp9blRgAbAbbd9Y0yJOfOIxUn8kIZj9EwOJcdKRm

