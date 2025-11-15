--
-- PostgreSQL database dump
--

\restrict QFXaibciNbBIaB7u17WDSIvaOHDi9EInsFsfOeaIo0QW7TEraX4Q6Ui9fpN7sDc

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

ALTER TABLE IF EXISTS ONLY public.routes DROP CONSTRAINT IF EXISTS routes_start_term_id_fkey;
ALTER TABLE IF EXISTS ONLY public.route_steps DROP CONSTRAINT IF EXISTS route_steps_term_id_fkey;
ALTER TABLE IF EXISTS ONLY public.route_steps DROP CONSTRAINT IF EXISTS route_steps_route_id_fkey;
ALTER TABLE IF EXISTS ONLY public.route_distractors DROP CONSTRAINT IF EXISTS route_distractors_term_id_fkey;
ALTER TABLE IF EXISTS ONLY public.route_distractors DROP CONSTRAINT IF EXISTS route_distractors_route_id_step_no_fkey;
ALTER TABLE IF EXISTS ONLY public.relations DROP CONSTRAINT IF EXISTS relations_src_id_fkey;
ALTER TABLE IF EXISTS ONLY public.relations DROP CONSTRAINT IF EXISTS relations_dst_id_fkey;
ALTER TABLE IF EXISTS ONLY public.games DROP CONSTRAINT IF EXISTS games_route_id_fkey;
DROP TRIGGER IF EXISTS trigger_terms_updated_at ON public.terms;
DROP TRIGGER IF EXISTS games_updated_at ON public.games;
DROP INDEX IF EXISTS public.idx_relations_type;
DROP INDEX IF EXISTS public.idx_relations_src;
DROP INDEX IF EXISTS public.idx_relations_dst;
DROP INDEX IF EXISTS public.idx_games_route_id;
DROP INDEX IF EXISTS public.idx_games_created_at;
ALTER TABLE IF EXISTS ONLY public.terms DROP CONSTRAINT IF EXISTS terms_pkey;
ALTER TABLE IF EXISTS ONLY public.terms DROP CONSTRAINT IF EXISTS terms_name_key;
ALTER TABLE IF EXISTS ONLY public.routes DROP CONSTRAINT IF EXISTS routes_pkey;
ALTER TABLE IF EXISTS ONLY public.route_steps DROP CONSTRAINT IF EXISTS route_steps_pkey;
ALTER TABLE IF EXISTS ONLY public.route_distractors DROP CONSTRAINT IF EXISTS route_distractors_pkey;
ALTER TABLE IF EXISTS ONLY public.relations DROP CONSTRAINT IF EXISTS relations_src_id_dst_id_relation_type_key;
ALTER TABLE IF EXISTS ONLY public.relations DROP CONSTRAINT IF EXISTS relations_pkey;
ALTER TABLE IF EXISTS ONLY public.games DROP CONSTRAINT IF EXISTS games_pkey;
ALTER TABLE IF EXISTS public.terms ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.routes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.relations ALTER COLUMN id DROP DEFAULT;
DROP VIEW IF EXISTS public.v_route_quality;
DROP VIEW IF EXISTS public.v_dead_points;
DROP VIEW IF EXISTS public.v_term_degrees;
DROP SEQUENCE IF EXISTS public.terms_id_seq;
DROP TABLE IF EXISTS public.terms;
DROP SEQUENCE IF EXISTS public.routes_id_seq;
DROP TABLE IF EXISTS public.routes;
DROP TABLE IF EXISTS public.route_steps;
DROP TABLE IF EXISTS public.route_distractors;
DROP SEQUENCE IF EXISTS public.relations_id_seq;
DROP TABLE IF EXISTS public.relations;
DROP TABLE IF EXISTS public.games;
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.update_games_updated_at();
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
    relation_type text NOT NULL,
    keyword text,
    explanation text,
    weight real DEFAULT 1.0,
    system_generated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE relations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.relations IS '用語間のリレーション（辺）';


--
-- Name: COLUMN relations.src_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.src_id IS '起点用語ID';


--
-- Name: COLUMN relations.dst_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.dst_id IS '終点用語ID';


--
-- Name: COLUMN relations.relation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.relation_type IS 'リレーション種別';


--
-- Name: COLUMN relations.keyword; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.keyword IS '簡潔な説明';


--
-- Name: COLUMN relations.explanation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.explanation IS '詳細な説明';


--
-- Name: COLUMN relations.system_generated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.relations.system_generated IS 'true = 自動補完（後で置換推奨）';


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
    name text NOT NULL,
    era text NOT NULL,
    year integer,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.terms IS '歴史用語マスタ';


--
-- Name: COLUMN terms.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.terms.name IS '用語名（例：明治維新）';


--
-- Name: COLUMN terms.era; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.terms.era IS '時代区分';


--
-- Name: COLUMN terms.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.terms.tags IS 'タグ（カテゴリ）';


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
-- Name: v_term_degrees; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_term_degrees AS
 SELECT t.id,
    t.name,
    t.era,
    COALESCE(count(r.id), (0)::bigint) AS degree
   FROM (public.terms t
     LEFT JOIN public.relations r ON (((r.src_id = t.id) OR (r.dst_id = t.id))))
  GROUP BY t.id, t.name, t.era
  ORDER BY COALESCE(count(r.id), (0)::bigint), t.id;


--
-- Name: VIEW v_term_degrees; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_term_degrees IS '各用語の次数（リレーション数）を表示';


--
-- Name: v_dead_points; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dead_points AS
 SELECT id,
    name,
    era,
    degree
   FROM public.v_term_degrees
  WHERE (degree < 2);


--
-- Name: VIEW v_dead_points; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_dead_points IS '次数2未満のノード（ゲーム継続不可）';


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

INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (1, 1, 11, '契機', '農耕開始', '狩猟採集から農耕社会への移行', 1, false, '2025-11-15 17:05:13.513147+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (2, 1, 17, '同時代', '集落の形成', '縄文集落が大和政権の基盤に', 1, false, '2025-11-15 17:05:13.514709+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (3, 1, 18, '文化', '墓制の進化', '縄文の土器文化から古墳文化へ', 1, false, '2025-11-15 17:05:13.51566+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (4, 2, 3, '政策', '市民による統治', 'ポリスの発展がアテネ民主政の基盤を作った', 1, false, '2025-11-15 17:05:13.517105+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (5, 2, 5, '文化', '市民社会と哲学', 'ポリスの発展が哲学の隆盛を生む', 1, false, '2025-11-15 17:05:13.518559+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (6, 2, 9, '文化', '市民社会と学問', 'ポリスの発展が学問の基礎を作る', 1, false, '2025-11-15 17:05:13.519646+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (7, 3, 4, '契機', 'ペルシアの脅威', '民主政アテネがペルシア戦争で中心的役割', 1, false, '2025-11-15 17:05:13.52054+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (8, 3, 7, '因果', 'アテネとスパルタの対立', '民主政アテネと寡頭政スパルタの対立', 1, false, '2025-11-15 17:05:13.521246+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (9, 4, 3, '因果', '勝利による自信', 'ペルシア戦争の勝利が民主政の全盛期をもたらす', 1, false, '2025-11-15 17:05:13.521884+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (10, 4, 12, '対立', 'ギリシャvsペルシア', 'ペルシア戦争と同時代にカルタゴの脅威', 1, false, '2025-11-15 17:05:13.522503+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (11, 5, 8, '同時代', '師弟関係', 'ソクラテスの弟子がプラトン', 1, false, '2025-11-15 17:05:13.523134+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (12, 5, 45, '文化', '哲学の継承', 'ソクラテスの思想がスコラ哲学に影響', 1, false, '2025-11-15 17:05:13.524144+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (13, 6, 14, '文化', '法の支配', 'ローマ法がローマ帝国の統治を支える', 1, false, '2025-11-15 17:05:13.525106+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (14, 6, 36, '文化', '法と制度', 'ローマ法の伝統が封建制度に影響', 1, false, '2025-11-15 17:05:13.526064+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (15, 6, 51, '文化', '法の伝統', 'ローマ法の伝統がマグナ・カルタに影響', 1, false, '2025-11-15 17:05:13.526675+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (16, 7, 2, '因果', 'ポリス間の戦争', 'ペロポネソス戦争がポリスの衰退を招く', 1, false, '2025-11-15 17:05:13.52726+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (17, 7, 10, '契機', 'ギリシャの弱体化', 'ペロポネソス戦争後の混乱期にマケドニア台頭', 1, false, '2025-11-15 17:05:13.527856+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (18, 8, 2, '文化', '理想国家論', 'プラトンがポリス論を展開', 1, false, '2025-11-15 17:05:13.528455+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (19, 8, 9, '同時代', '師弟関係', 'プラトンの弟子がアリストテレス', 1, false, '2025-11-15 17:05:13.52905+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (20, 8, 45, '文化', 'プラトン哲学の継承', 'プラトンの思想がスコラ哲学の基礎', 1, false, '2025-11-15 17:05:13.529628+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (21, 9, 10, '同時代', '師と王', 'アリストテレスがアレクサンドロスの家庭教師', 1, false, '2025-11-15 17:05:13.530269+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (22, 9, 45, '文化', 'アリストテレス哲学の継承', 'アリストテレスがスコラ哲学の中心', 1, false, '2025-11-15 17:05:13.530923+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (23, 10, 4, '対立', 'ギリシャ統一', 'アレクサンドロスがペルシアを征服', 1, false, '2025-11-15 17:05:13.531572+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (24, 10, 9, '同時代', '師弟関係', 'アリストテレスがアレクサンドロスの教師', 1, false, '2025-11-15 17:05:13.532213+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (25, 10, 14, '対立', 'ヘレニズムvsローマ', 'アレクサンドロス後継国とローマの対立', 1, false, '2025-11-15 17:05:13.533223+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (26, 10, 14, '因果', 'ヘレニズム文化の拡散', 'アレクサンドロス帝国がローマに影響', 1, false, '2025-11-15 17:05:13.534927+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (27, 11, 17, '因果', '農耕による統一', '稲作の普及が政治統合を促進', 1, false, '2025-11-15 17:05:13.536163+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (28, 11, 18, '文化', '墳墓の発展', '弥生の墓制が古墳へ進化', 1, false, '2025-11-15 17:05:13.53707+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (29, 11, 23, '同時代', '大陸文化流入', '弥生の技術が遣隋使の基礎', 1, false, '2025-11-15 17:05:13.537733+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (30, 12, 13, '同時代', '共和政末期', 'ポエニ戦争とカエサルの時代が近い', 1, false, '2025-11-15 17:05:13.538381+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (31, 12, 14, '契機', 'カルタゴ打倒', 'ポエニ戦争の勝利でローマが地中海制覇', 1, false, '2025-11-15 17:05:13.53906+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (32, 13, 12, '対立', 'ローマの拡大', 'カエサルが軍事指揮官としてガリア征服', 1, false, '2025-11-15 17:05:13.539733+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (33, 13, 14, '因果', '共和政の終焉', 'カエサルの独裁が帝政への道を開く', 1, false, '2025-11-15 17:05:13.540393+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (34, 14, 6, '政策', '帝国の統治', 'ローマ帝国が法体系を整備', 1, false, '2025-11-15 17:05:13.541037+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (35, 14, 15, '政策', '宗教弾圧から保護へ', 'ローマ帝国がキリスト教を迫害後に公認', 1, false, '2025-11-15 17:05:13.541783+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (36, 14, 19, '対立', '帝国vs部族', 'ローマ帝国とゲルマン諸部族の対立', 1, false, '2025-11-15 17:05:13.54276+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (37, 14, 20, '契機', '東西ローマ分裂', 'ローマ帝国分裂後にビザンツ帝国が東を継承', 1, false, '2025-11-15 17:05:13.543437+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (38, 14, 21, '契機', '西ローマ滅亡', 'ローマ帝国滅亡後にフランク王国が台頭', 1, false, '2025-11-15 17:05:13.544103+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (39, 14, 36, '契機', '中央権力の崩壊', 'ローマ帝国滅亡が封建制度を生む', 1, false, '2025-11-15 17:05:13.544724+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (40, 15, 16, '契機', '国教化', 'キリスト教の拡大がコンスタンティヌスに影響', 1, false, '2025-11-15 17:05:13.54547+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (41, 15, 19, '同時代', '混乱期の希望', 'キリスト教がゲルマン人移動期に拡大', 1, false, '2025-11-15 17:05:13.546269+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (42, 15, 21, '文化', 'キリスト教の継承', 'キリスト教がフランク王国に受け継がれる', 1, false, '2025-11-15 17:05:13.546934+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (43, 15, 39, '契機', '教会の権力拡大', 'キリスト教が中世ヨーロッパの中心勢力', 1, false, '2025-11-15 17:05:13.547553+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (44, 15, 40, '契機', '教義の対立', 'キリスト教の拡大が東西教会分裂の原因', 1, false, '2025-11-15 17:05:13.54814+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (45, 16, 14, '政策', 'キリスト教公認', 'コンスタンティヌス帝がキリスト教を国教化', 1, false, '2025-11-15 17:05:13.548736+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (46, 16, 15, '政策', '宗教の制度化', 'コンスタンティヌス帝がキリスト教を組織化', 1, false, '2025-11-15 17:05:13.549758+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (47, 16, 39, '因果', '教会の制度化', 'コンスタンティヌスの政策が教皇権の基礎', 1, false, '2025-11-15 17:05:13.551092+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (48, 17, 18, '政策', '権威の象徴', '古墳建造による権力誇示', 1, false, '2025-11-15 17:05:13.552192+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (49, 17, 22, '因果', '中央集権化', '大和政権が聖徳太子の基盤', 1, false, '2025-11-15 17:05:13.55292+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (50, 17, 23, '外交', '国際関係構築', '大和政権が遣隋使派遣', 1, false, '2025-11-15 17:05:13.553586+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (51, 17, 27, '契機', '改革の土台', '大和政権の限界が大化の改新を誘発', 1, false, '2025-11-15 17:05:13.554275+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (52, 18, 22, '文化', '仏教導入', '古墳文化から仏教文化への転換', 1, false, '2025-11-15 17:05:13.554935+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (53, 18, 27, '契機', '改革の契機', '古墳時代の権力構造が改革を促す', 1, false, '2025-11-15 17:05:13.555559+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (54, 18, 32, '同時代', '権力構造', '古墳時代と奈良時代の連続性', 1, false, '2025-11-15 17:05:13.556165+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (55, 19, 14, '因果', '帝国の衰退', 'ゲルマン人の大移動がローマ帝国を滅ぼす', 1, false, '2025-11-15 17:05:13.556785+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (56, 19, 21, '因果', 'ゲルマン諸王国', 'ゲルマン人がフランク王国を建国', 1, false, '2025-11-15 17:05:13.557379+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (57, 19, 36, '因果', '封建制の成立', 'ゲルマン人社会が封建制度の基盤', 1, false, '2025-11-15 17:05:13.557977+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (58, 20, 26, '対立', '東方vs西方', 'ビザンツ帝国とイスラム帝国の対立', 1, false, '2025-11-15 17:05:13.558561+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (59, 20, 26, '同時代', '東方の対立', 'ビザンツとイスラムは長期対立', 1, false, '2025-11-15 17:05:13.559179+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (60, 20, 40, '因果', '東西対立', 'ビザンツ帝国が東方正教会の中心', 1, false, '2025-11-15 17:05:13.559764+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (61, 20, 50, '対立', 'ビザンツvsモンゴル', 'ビザンツ帝国がモンゴル帝国に圧迫される', 1, false, '2025-11-15 17:05:13.560391+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (62, 20, 58, '文化', '古典文化の保存', 'ビザンツ帝国が古典文化をルネサンスに伝える', 1, false, '2025-11-15 17:05:13.561137+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (63, 20, 68, '契機', '東方貿易の知識', 'ビザンツ帝国が大航海時代の知識を提供', 1, false, '2025-11-15 17:05:13.561814+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (64, 21, 34, '政策', '帝国の再興', 'フランク王国がカール大帝で最盛期', 1, false, '2025-11-15 17:05:13.562693+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (65, 21, 63, '契機', 'フランス王国の基礎', 'フランク王国がフランス王国の起源', 1, false, '2025-11-15 17:05:13.563837+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (66, 22, 23, '外交', '小野妹子派遣', '遣隋使で大陸文化導入', 1, false, '2025-11-15 17:05:13.564802+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (67, 22, 24, '政策', '能力主義導入', '冠位十二階で官僚制度確立', 1, false, '2025-11-15 17:05:13.56607+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (68, 22, 25, '政策', '政治理念確立', '憲法十七条で中央集権思想', 1, false, '2025-11-15 17:05:13.567762+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (69, 22, 27, '契機', '中央集権の源流', '聖徳太子の思想が大化の改新に', 1, false, '2025-11-15 17:05:13.569325+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (70, 22, 32, '文化', '仏教振興の基盤', '奈良時代の仏教文化の礎', 1, false, '2025-11-15 17:05:13.570832+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (71, 23, 27, '契機', '大陸制度導入', '隋の制度が大化の改新に影響', 1, false, '2025-11-15 17:05:13.571654+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (72, 23, 28, '外交', '外交関係悪化', '遣隋使停止が白村江へ', 1, false, '2025-11-15 17:05:13.572699+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (73, 23, 30, '因果', '律令制の学習', '隋の律令を学び大宝律令へ', 1, false, '2025-11-15 17:05:13.573402+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (74, 23, 32, '文化', '仏教文化導入', '奈良時代の文化基盤', 1, false, '2025-11-15 17:05:13.57403+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (75, 24, 25, '同時代', '制度整備', '冠位と憲法で政治体制構築', 1, false, '2025-11-15 17:05:13.57494+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (76, 24, 27, '契機', '官僚制の確立', '冠位制度が大化の改新の基礎', 1, false, '2025-11-15 17:05:13.575849+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (77, 24, 30, '因果', '律令制への道', '冠位制度が大宝律令に発展', 1, false, '2025-11-15 17:05:13.576931+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (78, 25, 27, '契機', '中央集権思想', '憲法の理念が大化の改新に', 1, false, '2025-11-15 17:05:13.577896+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (79, 25, 30, '因果', '法治国家への道', '憲法十七条が律令制の基礎', 1, false, '2025-11-15 17:05:13.57854+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (80, 25, 32, '文化', '政治理念', '奈良時代の政治思想の源流', 1, false, '2025-11-15 17:05:13.579218+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (81, 26, 33, '対立', 'イスラムvsキリスト', 'イスラム支配下のスペインをレコンキスタで奪還', 1, false, '2025-11-15 17:05:13.579805+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (82, 26, 44, '契機', 'イスラムの脅威', 'イスラム帝国拡大が十字軍の理由', 1, false, '2025-11-15 17:05:13.580407+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (83, 26, 68, '契機', '東方への憧れ', 'イスラム帝国の繁栄が大航海時代の動機', 1, false, '2025-11-15 17:05:13.58099+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (84, 27, 28, '契機', '外敵への危機感', '改革が軍事強化を促進', 1, false, '2025-11-15 17:05:13.581567+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (85, 27, 29, '因果', '権力闘争激化', '改革の混乱が壬申の乱へ', 1, false, '2025-11-15 17:05:13.582172+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (86, 27, 30, '因果', '律令制確立', '大化の改新が大宝律令に結実', 1, false, '2025-11-15 17:05:13.583016+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (87, 27, 31, '政策', '都城建設', '中央集権化で平城京建設', 1, false, '2025-11-15 17:05:13.584804+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (88, 27, 32, '因果', '奈良時代の基礎', '改革が奈良時代を準備', 1, false, '2025-11-15 17:05:13.585632+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (89, 28, 29, '契機', '防衛体制強化', '敗戦が国内権力闘争を誘発', 1, false, '2025-11-15 17:05:13.586309+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (90, 28, 30, '契機', '律令制確立の急務', '外敵脅威が制度整備を促進', 1, false, '2025-11-15 17:05:13.58692+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (91, 28, 31, '契機', '防衛都市建設', '白村江敗戦が平城京建設を促進', 1, false, '2025-11-15 17:05:13.587555+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (92, 29, 30, '因果', '律令制の確立', '内乱終結後に大宝律令制定', 1, false, '2025-11-15 17:05:13.58823+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (93, 29, 31, '因果', '新都建設', '天武天皇が平城京建設計画', 1, false, '2025-11-15 17:05:13.588867+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (94, 29, 32, '因果', '奈良時代の始まり', '壬申の乱が奈良時代を準備', 1, false, '2025-11-15 17:05:13.589476+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (95, 30, 31, '政策', '律令国家の都', '律令制に基づく平城京建設', 1, false, '2025-11-15 17:05:13.590045+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (96, 30, 32, '因果', '奈良時代の基盤', '大宝律令が奈良時代を確立', 1, false, '2025-11-15 17:05:13.590622+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (97, 30, 35, '同時代', '律令制の継続', '平安京でも律令制維持', 1, false, '2025-11-15 17:05:13.591321+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (98, 30, 38, '契機', '制度の限界', '律令制の形骸化が摂関政治へ', 1, false, '2025-11-15 17:05:13.592015+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (99, 31, 32, '因果', '奈良時代の中心', '平城京が奈良時代の都', 1, false, '2025-11-15 17:05:13.593113+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (100, 31, 35, '契機', '遷都', '平城京から平安京へ', 1, false, '2025-11-15 17:05:13.593793+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (101, 31, 38, '同時代', '都市構造', '都城制が摂関政治の舞台', 1, false, '2025-11-15 17:05:13.59445+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (102, 32, 35, '契機', '政治刷新', '奈良の仏教政治から平安京へ', 1, false, '2025-11-15 17:05:13.595141+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (103, 32, 38, '因果', '貴族政治の基礎', '奈良時代が摂関政治を準備', 1, false, '2025-11-15 17:05:13.595817+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (104, 32, 43, '同時代', '政治構造', '奈良の律令制が院政の基盤', 1, false, '2025-11-15 17:05:13.596526+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (105, 33, 44, '同時代', 'キリスト教世界の防衛', 'レコンキスタと十字軍は同じ聖戦', 1, false, '2025-11-15 17:05:13.597136+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (106, 33, 68, '契機', '海洋進出の準備', 'レコンキスタ完了後にスペインが大航海時代へ', 1, false, '2025-11-15 17:05:13.597822+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (107, 33, 82, '同時代', 'カトリックの拡大', 'レコンキスタとイエズス会の布教は同じ精神', 1, false, '2025-11-15 17:05:13.598456+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (108, 34, 21, '政策', '帝国統一', 'カール大帝がフランク王国を拡大', 1, false, '2025-11-15 17:05:13.599113+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (109, 34, 36, '政策', '封建制の確立', 'カール大帝の分裂後に封建制度が発展', 1, false, '2025-11-15 17:05:13.600081+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (110, 34, 39, '政策', '教皇との協力', 'カール大帝が教皇から戴冠', 1, false, '2025-11-15 17:05:13.601607+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (111, 34, 77, '文化', '中央集権の萌芽', 'カール大帝の統治が絶対王政の先駆', 1, false, '2025-11-15 17:05:13.602349+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (112, 35, 38, '因果', '摂関政治の舞台', '平安京で藤原氏が台頭', 1, false, '2025-11-15 17:05:13.603011+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (113, 35, 43, '同時代', '院政の開始', '平安京で院政が展開', 1, false, '2025-11-15 17:05:13.603675+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (114, 35, 46, '同時代', '武士の台頭', '平安京で平清盛が権力掌握', 1, false, '2025-11-15 17:05:13.604295+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (115, 36, 37, '政策', '農業経済', '封建制度が荘園制を生む', 1, false, '2025-11-15 17:05:13.604907+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (116, 36, 63, '契機', '封建領主の対立', '封建制度が英仏の領土争いを生む', 1, false, '2025-11-15 17:05:13.605521+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (117, 37, 64, '契機', '農村の崩壊', '荘園制下の農村がペストで大打撃', 1, false, '2025-11-15 17:05:13.606104+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (118, 37, 77, '契機', '中央集権化の必要', '荘園制の崩壊が中央集権を促進', 1, false, '2025-11-15 17:05:13.606858+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (119, 38, 43, '契機', '天皇権威の回復', '摂関政治への反発が院政を生む', 1, false, '2025-11-15 17:05:13.607569+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (120, 38, 46, '対立', '貴族vs武士', '摂関政治の弱体化で平清盛台頭', 1, false, '2025-11-15 17:05:13.60826+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (121, 38, 47, '契機', '武家政権誕生', '摂関政治の限界が鎌倉幕府へ', 1, false, '2025-11-15 17:05:13.608883+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (122, 39, 42, '対立', '教皇vs皇帝', '教皇権拡大と皇帝権の対立がカノッサの屈辱', 1, false, '2025-11-15 17:05:13.609554+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (123, 39, 44, '契機', '聖地奪還', '教皇権の拡大が十字軍を引き起こす', 1, false, '2025-11-15 17:05:13.610194+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (124, 39, 66, '契機', '教皇権の対立', '教皇権拡大が教会分裂を引き起こす', 1, false, '2025-11-15 17:05:13.610818+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (125, 39, 77, '対立', '教皇権vs王権', '教皇権との対立が王権強化を促す', 1, false, '2025-11-15 17:05:13.61144+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (126, 39, 80, '契機', '教会腐敗への反発', '教皇権の腐敗が宗教改革を生む', 1, false, '2025-11-15 17:05:13.612071+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (127, 40, 39, '因果', '教会の分裂', '東西教会分裂が教皇権の限界を示す', 1, false, '2025-11-15 17:05:13.612687+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (128, 41, 51, '契機', '王権の制限', 'ノルマン征服後の王権強化への反発', 1, false, '2025-11-15 17:05:13.613329+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (129, 41, 52, '因果', 'ノルマン朝の専制', 'ノルマン征服後の王権強化が人権文書を生む', 1, false, '2025-11-15 17:05:13.613963+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (130, 41, 63, '契機', 'イングランドの成立', 'ノルマン征服が百年戦争の遠因', 1, false, '2025-11-15 17:05:13.614536+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (131, 42, 39, '因果', '教皇権の頂点', 'カノッサの屈辱が教皇権の絶頂期を示す', 1, false, '2025-11-15 17:05:13.615186+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (132, 43, 46, '因果', '武士の登用', '院政が平清盛を重用', 1, false, '2025-11-15 17:05:13.615989+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (133, 43, 47, '契機', '武家政権への道', '院政の混乱が源頼朝を生む', 1, false, '2025-11-15 17:05:13.617456+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (134, 43, 57, '同時代', '皇権回復の試み', '院政と後醍醐天皇の連続性', 1, false, '2025-11-15 17:05:13.622551+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (135, 44, 20, '契機', 'ビザンツの救援要請', 'ビザンツ帝国の要請で十字軍開始', 1, false, '2025-11-15 17:05:13.624609+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (136, 44, 26, '対立', '十字軍vsイスラム', '十字軍がイスラム帝国と戦う', 1, false, '2025-11-15 17:05:13.626492+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (137, 44, 39, '因果', '教皇の権威失墜', '十字軍の失敗が教皇権の衰退を招く', 1, false, '2025-11-15 17:05:13.627921+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (138, 44, 58, '文化', '東方文化の流入', '十字軍が東方文化をもたらしルネサンス準備', 1, false, '2025-11-15 17:05:13.629566+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (139, 44, 67, '同時代', '宗教戦争の時代', '十字軍とジャンヌ・ダルクは宗教的動機', 1, false, '2025-11-15 17:05:13.631316+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (140, 44, 82, '文化', '布教の精神', '十字軍の精神がイエズス会に継承', 1, false, '2025-11-15 17:05:13.633057+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (141, 45, 54, '文化', '神学の集大成', 'スコラ哲学がトマス・アクィナスで完成', 1, false, '2025-11-15 17:05:13.635173+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (142, 45, 80, '契機', 'スコラ哲学への批判', 'スコラ哲学の形式主義が宗教改革の要因', 1, false, '2025-11-15 17:05:13.636476+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (143, 46, 38, '対立', '貴族政治との対立', '武士の台頭が摂関政治を終焉', 1, false, '2025-11-15 17:05:13.638242+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (144, 46, 43, '同時代', '院政との癒着', '平清盛が院政を利用', 1, false, '2025-11-15 17:05:13.640051+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (145, 46, 47, '対立', '源平合戦', '平氏vs源氏の対立', 1, false, '2025-11-15 17:05:13.641484+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (146, 46, 48, '契機', '武家政権の先駆', '平清盛の失敗が鎌倉幕府の教訓', 1, false, '2025-11-15 17:05:13.642961+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (147, 47, 46, '対立', '源平合戦の勝者', '平清盛を倒して政権樹立', 1, false, '2025-11-15 17:05:13.644394+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (148, 47, 48, '因果', '鎌倉幕府樹立', '源頼朝が鎌倉幕府を開く', 1, false, '2025-11-15 17:05:13.645691+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (149, 47, 49, '因果', '執権政治の基盤', '源氏将軍断絶で執権政治へ', 1, false, '2025-11-15 17:05:13.646979+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (150, 47, 53, '契機', '朝廷vs幕府', '鎌倉幕府が承久の乱で勝利', 1, false, '2025-11-15 17:05:13.648325+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (151, 47, 55, '政策', '武家法の制定', '御成敗式目の基礎を築く', 1, false, '2025-11-15 17:05:13.650048+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (152, 48, 49, '因果', '執権政治へ移行', '将軍の権威失墜で執権が実権', 1, false, '2025-11-15 17:05:13.651497+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (153, 48, 53, '因果', '朝廷との対立', '承久の乱で幕府が勝利', 1, false, '2025-11-15 17:05:13.652977+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (154, 48, 55, '政策', '御成敗式目制定', '武家法の整備', 1, false, '2025-11-15 17:05:13.654198+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (155, 48, 56, '因果', '元寇への対応', '幕府の防衛体制', 1, false, '2025-11-15 17:05:13.655336+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (156, 48, 57, '対立', '倒幕運動', '後醍醐天皇が鎌倉幕府を倒す', 1, false, '2025-11-15 17:05:13.65626+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (157, 49, 53, '因果', '幕府権力確立', '承久の乱で執権政治が確立', 1, false, '2025-11-15 17:05:13.657085+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (158, 49, 55, '政策', '武家法整備', '執権北条氏が御成敗式目制定', 1, false, '2025-11-15 17:05:13.657847+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (159, 49, 56, '因果', '防衛体制', '元寇で執権政治が試される', 1, false, '2025-11-15 17:05:13.658607+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (160, 50, 20, '因果', 'ビザンツ衰退', 'モンゴル帝国の圧力でビザンツ弱体化', 1, false, '2025-11-15 17:05:13.659302+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (161, 50, 26, '対立', '東方の脅威', 'モンゴル帝国がイスラム帝国を圧迫', 1, false, '2025-11-15 17:05:13.660133+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (162, 50, 64, '契機', '疫病の媒介', 'モンゴル帝国がペストをヨーロッパに運ぶ', 1, false, '2025-11-15 17:05:13.661394+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (163, 50, 68, '契機', '陸路の遮断', 'モンゴル帝国衰退後に海路開拓が必要に', 1, false, '2025-11-15 17:05:13.662717+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (164, 50, 91, '同時代', '東西の大帝国', 'モンゴル帝国と三十年戦争は時代的に近い', 1, false, '2025-11-15 17:05:13.664021+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (165, 51, 41, '因果', '王権への制限', 'ノルマン征服後の強権への反発がマグナ・カルタ', 1, false, '2025-11-15 17:05:13.665363+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (166, 51, 63, '契機', '王権と貴族の対立', 'マグナ・カルタが百年戦争の背景', 1, false, '2025-11-15 17:05:13.666832+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (167, 51, 77, '対立', '貴族vs王権', 'マグナ・カルタの精神と絶対王政は対立', 1, false, '2025-11-15 17:05:13.668384+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (168, 52, 157, '契機', '人権思想の源流', 'マグナカルタが近代民主化運動の基礎に', 1, false, '2025-11-15 17:05:13.66948+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (169, 52, 209, '同時代', '英国の主権', 'マグナカルタからBrexitまでの主権意識', 1, false, '2025-11-15 17:05:13.670371+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (170, 53, 49, '因果', '執権政治確立', '乱の後に北条氏が権力掌握', 1, false, '2025-11-15 17:05:13.671274+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (171, 53, 56, '契機', '幕府権力強化', '承久の乱勝利で幕府が安定', 1, false, '2025-11-15 17:05:13.67215+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (172, 53, 57, '契機', '皇権回復の野望', '承久の乱の失敗が後醍醐天皇の動機', 1, false, '2025-11-15 17:05:13.672991+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (173, 53, 60, '契機', '倒幕への教訓', '承久の失敗が建武の新政へ', 1, false, '2025-11-15 17:05:13.673711+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (174, 54, 45, '文化', '哲学と神学の統合', 'トマス・アクィナスがスコラ哲学を体系化', 1, false, '2025-11-15 17:05:13.674375+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (175, 54, 58, '文化', '神学から人文学へ', 'トマス・アクィナスの理性論がルネサンスに影響', 1, false, '2025-11-15 17:05:13.675036+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (176, 55, 53, '同時代', '武家法の確立', '御成敗式目が幕府の正統性を支える', 1, false, '2025-11-15 17:05:13.675688+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (177, 55, 62, '同時代', '武家法の継承', '室町幕府も御成敗式目を踏襲', 1, false, '2025-11-15 17:05:13.676323+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (178, 55, 89, '同時代', '武家法の完成', '江戸幕府の法制の基礎', 1, false, '2025-11-15 17:05:13.676926+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (179, 56, 57, '契機', '幕府の弱体化', '元寇対応の失敗が倒幕運動を誘発', 1, false, '2025-11-15 17:05:13.677606+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (180, 56, 60, '契機', '政治変革の機運', '元寇後の混乱が建武の新政へ', 1, false, '2025-11-15 17:05:13.678242+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (181, 56, 73, '同時代', '武士の自立', '元寇経験が戦国武士の基礎', 1, false, '2025-11-15 17:05:13.678889+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (182, 57, 48, '対立', '鎌倉幕府打倒', '後醍醐天皇が倒幕成功', 1, false, '2025-11-15 17:05:13.679597+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (183, 57, 59, '対立', '武士との対立', '足利尊氏が後醍醐天皇に反旗', 1, false, '2025-11-15 17:05:13.68033+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (184, 57, 60, '因果', '建武の新政', '後醍醐天皇が親政を開始', 1, false, '2025-11-15 17:05:13.680989+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (185, 57, 61, '因果', '南北朝分裂', '後醍醐天皇が南朝を樹立', 1, false, '2025-11-15 17:05:13.681651+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (186, 58, 70, '同時代', '万能人', 'ルネサンスでレオナルドが活躍', 1, false, '2025-11-15 17:05:13.682323+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (187, 58, 70, '文化', 'ルネサンス芸術', 'ルネサンスでレオナルド・ダ・ヴィンチ活躍', 1, false, '2025-11-15 17:05:13.683398+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (188, 58, 74, '同時代', '芸術の巨匠', 'ルネサンスでミケランジェロが活躍', 1, false, '2025-11-15 17:05:13.684858+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (189, 58, 74, '文化', 'ルネサンス芸術', 'ルネサンスでミケランジェロ活躍', 1, false, '2025-11-15 17:05:13.685736+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (190, 58, 80, '契機', '教会批判の芽生え', 'ルネサンスの人文主義が宗教改革を準備', 1, false, '2025-11-15 17:05:13.686464+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (191, 58, 85, '契機', '人間中心主義', 'ルネサンスの人文主義が科学革命を準備', 1, false, '2025-11-15 17:05:13.687174+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (192, 58, 87, '文化', '人文主義と科学', 'ルネサンスの精神がガリレオに影響', 1, false, '2025-11-15 17:05:13.687884+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (193, 59, 57, '対立', '後醍醐天皇との対立', '尊氏が新政に反旗', 1, false, '2025-11-15 17:05:13.688578+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (194, 59, 61, '因果', '南北朝時代', '足利尊氏が北朝を擁立', 1, false, '2025-11-15 17:05:13.689251+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (195, 59, 62, '因果', '室町幕府樹立', '足利尊氏が幕府を開く', 1, false, '2025-11-15 17:05:13.689981+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (196, 59, 65, '同時代', '足利将軍家', '足利義満が尊氏の遺志を継ぐ', 1, false, '2025-11-15 17:05:13.690709+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (197, 60, 59, '契機', '武士の反発', '建武の新政の失敗で足利尊氏台頭', 1, false, '2025-11-15 17:05:13.691331+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (198, 60, 61, '因果', '南北朝分裂', '新政崩壊が南北朝時代を生む', 1, false, '2025-11-15 17:05:13.691937+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (199, 60, 62, '契機', '室町幕府成立', '新政の失敗が室町幕府へ', 1, false, '2025-11-15 17:05:13.692592+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (200, 61, 62, '同時代', '分裂政権', '南北朝と室町幕府の並立', 1, false, '2025-11-15 17:05:13.693274+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (201, 61, 65, '因果', '南北朝統一', '足利義満が南北朝を統一', 1, false, '2025-11-15 17:05:13.694225+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (202, 61, 72, '契機', '権力闘争の継続', '南北朝の混乱が応仁の乱へ', 1, false, '2025-11-15 17:05:13.695241+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (203, 62, 55, '同時代', '武家法の継承', '御成敗式目を基盤とする', 1, false, '2025-11-15 17:05:13.696252+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (204, 62, 65, '因果', '全盛期', '足利義満が室町幕府を確立', 1, false, '2025-11-15 17:05:13.697224+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (205, 62, 72, '因果', '応仁の乱', '幕府の弱体化が応仁の乱を招く', 1, false, '2025-11-15 17:05:13.697832+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (206, 62, 73, '因果', '戦国時代へ', '室町幕府の崩壊が戦国時代を生む', 1, false, '2025-11-15 17:05:13.698422+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (207, 62, 81, '契機', '統一への道', '幕府の混乱が織田信長を生む', 1, false, '2025-11-15 17:05:13.699339+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (208, 63, 64, '同時代', '疫病と戦争', '百年戦争中にペスト流行', 1, false, '2025-11-15 17:05:13.700952+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (209, 63, 67, '同時代', '英仏対立', '百年戦争でジャンヌ・ダルク活躍', 1, false, '2025-11-15 17:05:13.702521+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (210, 63, 77, '契機', '王権の強化', '百年戦争後に中央集権化が進む', 1, false, '2025-11-15 17:05:13.703414+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (211, 64, 36, '因果', '封建制の動揺', '黒死病が封建制度を揺るがす', 1, false, '2025-11-15 17:05:13.704173+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (212, 64, 37, '因果', '労働力不足', 'ペストが荘園制を崩壊させる', 1, false, '2025-11-15 17:05:13.704893+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (213, 64, 58, '契機', '中世の終焉', 'ペストが中世社会を崩壊させルネサンスへ', 1, false, '2025-11-15 17:05:13.705555+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (214, 64, 63, '契機', '社会混乱', 'ペストが社会不安を増大し戦争へ', 1, false, '2025-11-15 17:05:13.706204+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (215, 64, 80, '契機', '教会権威の失墜', 'ペストが教会の無力さを露呈し宗教改革へ', 1, false, '2025-11-15 17:05:13.706822+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (216, 64, 210, '同時代', 'パンデミック', '黒死病とCOVID-19のパンデミックの類似性', 1, false, '2025-11-15 17:05:13.707478+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (217, 65, 61, '因果', '南北朝統一', '義満が南北朝を統一', 1, false, '2025-11-15 17:05:13.708101+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (218, 65, 72, '契機', '権力闘争', '義満死後の混乱が応仁の乱へ', 1, false, '2025-11-15 17:05:13.708725+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (219, 65, 73, '同時代', '文化的繁栄', '義満の時代が戦国文化の基礎', 1, false, '2025-11-15 17:05:13.709403+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (220, 66, 39, '因果', '教会の分裂', '教会分裂が教皇権を弱体化', 1, false, '2025-11-15 17:05:13.710084+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (221, 66, 80, '契機', '教会不信', '教会分裂が宗教改革の遠因', 1, false, '2025-11-15 17:05:13.710738+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (222, 67, 63, '契機', 'フランスの勝利', 'ジャンヌ・ダルクが百年戦争の転機', 1, false, '2025-11-15 17:05:13.711413+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (223, 68, 69, '同時代', '新大陸発見', '大航海時代にコロンブスがアメリカ発見', 1, false, '2025-11-15 17:05:13.712062+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (224, 68, 71, '同時代', 'インド航路発見', '大航海時代にヴァスコ・ダ・ガマがインド到達', 1, false, '2025-11-15 17:05:13.7127+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (225, 68, 75, '同時代', '世界周航', '大航海時代にマゼランが世界一周', 1, false, '2025-11-15 17:05:13.713335+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (226, 68, 77, '契機', '海外領土の獲得', '大航海時代が絶対王政の富を増やす', 1, false, '2025-11-15 17:05:13.714027+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (227, 68, 78, '契機', '植民地経営', '大航海時代が重商主義を生む', 1, false, '2025-11-15 17:05:13.71477+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (228, 68, 112, '契機', '植民地の独立', '大航海時代の植民地がアメリカ独立', 1, false, '2025-11-15 17:05:13.71544+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (229, 69, 68, '同時代', '新大陸発見', 'コロンブスが大航海時代の象徴', 1, false, '2025-11-15 17:05:13.716351+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (230, 70, 74, '同時代', 'ルネサンス芸術家', 'レオナルドとミケランジェロは同時代', 1, false, '2025-11-15 17:05:13.717717+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (231, 70, 85, '文化', '芸術と科学の融合', 'レオナルド・ダ・ヴィンチが科学革命に先駆', 1, false, '2025-11-15 17:05:13.718865+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (232, 71, 68, '同時代', '東方航路', 'ヴァスコ・ダ・ガマが大航海時代の象徴', 1, false, '2025-11-15 17:05:13.71959+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (233, 72, 62, '因果', '幕府の弱体化', '応仁の乱で室町幕府が崩壊', 1, false, '2025-11-15 17:05:13.720336+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (234, 72, 73, '因果', '戦国時代の始まり', '応仁の乱が戦国時代を招く', 1, false, '2025-11-15 17:05:13.721041+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (235, 72, 81, '契機', '下剋上の時代', '応仁の乱が織田信長を生む', 1, false, '2025-11-15 17:05:13.721751+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (236, 72, 83, '契機', '統一への機運', '混乱が豊臣秀吉の統一を促す', 1, false, '2025-11-15 17:05:13.722433+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (237, 72, 84, '契機', '天下統一', '戦国の混乱が徳川家康の統一へ', 1, false, '2025-11-15 17:05:13.723119+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (238, 73, 81, '因果', '織田信長の台頭', '戦国時代に信長が登場', 1, false, '2025-11-15 17:05:13.723794+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (239, 73, 83, '因果', '豊臣秀吉の統一', '戦国時代を秀吉が統一', 1, false, '2025-11-15 17:05:13.724472+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (240, 73, 84, '因果', '徳川家康の統一', '戦国時代を家康が終結', 1, false, '2025-11-15 17:05:13.725092+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (241, 73, 88, '因果', '関ヶ原の戦い', '戦国の遺恨が関ヶ原へ', 1, false, '2025-11-15 17:05:13.72569+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (242, 74, 58, '文化', '芸術の開花', 'ミケランジェロがルネサンス芸術を代表', 1, false, '2025-11-15 17:05:13.726313+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (243, 75, 68, '同時代', '世界一周', 'マゼランが大航海時代の象徴', 1, false, '2025-11-15 17:05:13.726934+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (244, 76, 80, '契機', '改革の開始', 'ルターが宗教改革の口火を切る', 1, false, '2025-11-15 17:05:13.727553+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (245, 76, 86, '対立', 'プロテスタントvsカトリック', 'ルターの改革に対抗宗教改革が対抗', 1, false, '2025-11-15 17:05:13.728154+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (246, 76, 87, '対立', '宗教vs科学', 'ルターの宗教改革とガリレオの科学は緊張関係', 1, false, '2025-11-15 17:05:13.72883+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (247, 77, 78, '政策', '経済政策', '絶対王政が重商主義を推進', 1, false, '2025-11-15 17:05:13.729501+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (248, 77, 91, '契機', '王権の拡大', '絶対王政の対立が三十年戦争の一因', 1, false, '2025-11-15 17:05:13.730197+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (249, 77, 94, '同時代', 'フランス絶対王政', '絶対王政でルイ14世が典型', 1, false, '2025-11-15 17:05:13.730986+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (250, 77, 114, '対立', '絶対王政への反発', '絶対王政がフランス革命を引き起こす', 1, false, '2025-11-15 17:05:13.731652+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (251, 78, 68, '政策', '植民地獲得競争', '重商主義が大航海時代を加速', 1, false, '2025-11-15 17:05:13.732325+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (252, 78, 77, '政策', '絶対王政の経済政策', '重商主義が絶対王政を支える', 1, false, '2025-11-15 17:05:13.733259+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (253, 78, 109, '契機', '資本蓄積', '重商主義が産業革命の資本を準備', 1, false, '2025-11-15 17:05:13.73453+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (254, 79, 80, '契機', '改革の拡大', 'カルヴァンが宗教改革を深化', 1, false, '2025-11-15 17:05:13.735526+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (255, 79, 86, '対立', 'カルヴァン派vsカトリック', 'カルヴァン派に対抗宗教改革が対抗', 1, false, '2025-11-15 17:05:13.736228+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (256, 80, 76, '契機', '95ヶ条の論題', '宗教改革でマルティン・ルターが先駆', 1, false, '2025-11-15 17:05:13.736887+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (257, 80, 77, '契機', '王権の強化', '宗教改革後に王権が教皇権に勝利', 1, false, '2025-11-15 17:05:13.737541+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (258, 80, 79, '同時代', 'プロテスタント諸派', '宗教改革でカルヴァンも活躍', 1, false, '2025-11-15 17:05:13.738147+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (259, 80, 82, '対立', '新教vs旧教', '宗教改革に対しイエズス会が対抗', 1, false, '2025-11-15 17:05:13.73874+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (260, 80, 86, '対立', '新旧教会の対立', '宗教改革と対抗宗教改革は対立関係', 1, false, '2025-11-15 17:05:13.739354+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (261, 80, 91, '契機', '宗教対立の激化', '宗教改革が三十年戦争を引き起こす', 1, false, '2025-11-15 17:05:13.739996+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (262, 80, 112, '文化', 'プロテスタント精神', '宗教改革の自由の精神がアメリカ独立に影響', 1, false, '2025-11-15 17:05:13.740597+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (263, 81, 73, '因果', '戦国統一の始まり', '信長が戦国統一を開始', 1, false, '2025-11-15 17:05:13.741188+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (264, 81, 83, '因果', '秀吉の継承', '信長死後に秀吉が統一', 1, false, '2025-11-15 17:05:13.741819+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (265, 81, 84, '同時代', '三英傑', '信長・秀吉・家康の三者', 1, false, '2025-11-15 17:05:13.74275+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (266, 81, 88, '契機', '天下統一の基盤', '信長の業績が関ヶ原へ', 1, false, '2025-11-15 17:05:13.743649+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (267, 81, 89, '契機', '江戸幕府の基礎', '信長の政策が江戸幕府へ', 1, false, '2025-11-15 17:05:13.744696+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (268, 82, 68, '同時代', '海外布教', 'イエズス会が大航海時代に布教活動', 1, false, '2025-11-15 17:05:13.745892+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (269, 82, 80, '対立', 'カトリックの反撃', 'イエズス会が宗教改革に対抗', 1, false, '2025-11-15 17:05:13.746635+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (270, 82, 86, '政策', 'イエズス会の活動', 'イエズス会が対抗宗教改革の中心', 1, false, '2025-11-15 17:05:13.747251+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (271, 83, 81, '因果', '信長の継承', '秀吉が信長の遺志を継ぐ', 1, false, '2025-11-15 17:05:13.74794+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (272, 83, 84, '対立', '秀吉vs家康', '秀吉死後に家康が台頭', 1, false, '2025-11-15 17:05:13.748634+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (273, 83, 88, '契機', '関ヶ原の遠因', '秀吉の死が関ヶ原を招く', 1, false, '2025-11-15 17:05:13.749523+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (274, 83, 89, '契機', '江戸幕府の基盤', '秀吉の統一が家康の基礎', 1, false, '2025-11-15 17:05:13.751395+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (275, 83, 96, '政策', '鎖国の先駆', '秀吉のキリスト教政策が鎖国へ', 1, false, '2025-11-15 17:05:13.752932+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (276, 84, 83, '対立', '秀吉との対立', '秀吉死後に家康が天下取り', 1, false, '2025-11-15 17:05:13.754011+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (277, 84, 88, '因果', '関ヶ原の戦い', '家康が関ヶ原で勝利', 1, false, '2025-11-15 17:05:13.754683+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (278, 84, 89, '因果', '江戸幕府樹立', '家康が江戸幕府を開く', 1, false, '2025-11-15 17:05:13.755337+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (279, 84, 90, '政策', '幕藩体制確立', '家康が幕藩体制を構築', 1, false, '2025-11-15 17:05:13.756119+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (280, 84, 96, '政策', '鎖国政策の基盤', '家康の外交政策が鎖国へ', 1, false, '2025-11-15 17:05:13.756739+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (281, 85, 77, '契機', '合理的統治', '科学革命が絶対王政の官僚制を支える', 1, false, '2025-11-15 17:05:13.757382+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (282, 85, 87, '文化', '天文学革命', '科学革命でガリレオが地動説支持', 1, false, '2025-11-15 17:05:13.757967+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (283, 85, 97, '文化', '物理学革命', '科学革命でニュートンが法則発見', 1, false, '2025-11-15 17:05:13.758562+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (284, 85, 100, '契機', '理性の重視', '科学革命が啓蒙思想を生む', 1, false, '2025-11-15 17:05:13.759173+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (285, 85, 109, '契機', '技術革新', '科学革命が産業革命の基礎を作る', 1, false, '2025-11-15 17:05:13.759856+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (286, 86, 80, '対立', '旧教の反撃', '対抗宗教改革が宗教改革に対抗', 1, false, '2025-11-15 17:05:13.760835+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (287, 86, 82, '政策', 'カトリック側の対応', '対抗宗教改革でイエズス会が活動', 1, false, '2025-11-15 17:05:13.762036+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (288, 87, 80, '対立', '科学vs宗教', 'ガリレオが教会と対立し宗教改革に影響', 1, false, '2025-11-15 17:05:13.762725+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (289, 87, 85, '文化', '天文学の革新', 'ガリレオが科学革命を推進', 1, false, '2025-11-15 17:05:13.763351+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (290, 88, 84, '因果', '家康の勝利', '家康が関ヶ原で天下統一', 1, false, '2025-11-15 17:05:13.763943+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (291, 88, 89, '因果', '江戸幕府成立', '関ヶ原の勝利で江戸幕府樹立', 1, false, '2025-11-15 17:05:13.764528+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (292, 88, 90, '因果', '幕藩体制確立', '関ヶ原後に幕藩体制構築', 1, false, '2025-11-15 17:05:13.76508+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (293, 88, 92, '政策', '大名統制', '関ヶ原後に参勤交代制度', 1, false, '2025-11-15 17:05:13.765694+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (294, 88, 96, '政策', '外交統制', '関ヶ原後に鎖国政策へ', 1, false, '2025-11-15 17:05:13.766756+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (295, 89, 90, '政策', '幕藩体制', '江戸幕府が幕藩体制を確立', 1, false, '2025-11-15 17:05:13.768508+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (296, 89, 92, '政策', '参勤交代', '江戸幕府が大名統制', 1, false, '2025-11-15 17:05:13.76939+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (297, 89, 96, '政策', '鎖国', '江戸幕府が鎖国政策実施', 1, false, '2025-11-15 17:05:13.770042+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (298, 89, 133, '契機', 'ペリー来航', '幕府の危機', 1, false, '2025-11-15 17:05:13.770686+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (299, 89, 144, '因果', '大政奉還', '江戸幕府の終焉', 1, false, '2025-11-15 17:05:13.771316+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (300, 90, 92, '政策', '大名統制', '幕藩体制の一環として参勤交代', 1, false, '2025-11-15 17:05:13.771924+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (301, 90, 96, '政策', '外交統制', '幕藩体制の一環として鎖国', 1, false, '2025-11-15 17:05:13.772536+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (302, 90, 144, '因果', '体制崩壊', '幕藩体制の限界が大政奉還へ', 1, false, '2025-11-15 17:05:13.773129+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (303, 91, 76, '契機', '宗教対立', 'ルターの改革が三十年戦争の遠因', 1, false, '2025-11-15 17:05:13.773728+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (304, 91, 77, '因果', '国家主権の確立', '三十年戦争が絶対王政を強化', 1, false, '2025-11-15 17:05:13.774315+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (305, 91, 80, '因果', '宗教対立の激化', '宗教改革の対立が三十年戦争を引き起こす', 1, false, '2025-11-15 17:05:13.774908+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (306, 91, 86, '契機', '宗教戦争', '対抗宗教改革の対立が三十年戦争へ', 1, false, '2025-11-15 17:05:13.775605+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (307, 91, 99, '因果', '宗教戦争の終結', '三十年戦争後にウェストファリア条約', 1, false, '2025-11-15 17:05:13.776577+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (308, 92, 106, '契機', '財政悪化', '参勤交代の負担が享保の改革を促す', 1, false, '2025-11-15 17:05:13.777542+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (309, 92, 113, '契機', '幕府財政', '参勤交代が寛政の改革の背景', 1, false, '2025-11-15 17:05:13.778242+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (310, 92, 124, '契機', '改革の必要性', '参勤交代が天保の改革を促す', 1, false, '2025-11-15 17:05:13.778966+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (311, 93, 89, '同時代', '幕府の危機', '島原の乱が江戸幕府の統制を促す', 1, false, '2025-11-15 17:05:13.779672+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (312, 93, 96, '因果', '鎖国強化', '島原の乱後に鎖国が徹底', 1, false, '2025-11-15 17:05:13.780351+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (313, 93, 98, '契機', '政治引き締め', '島原の乱が幕府の宗教政策を強化', 1, false, '2025-11-15 17:05:13.781011+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (314, 94, 77, '同時代', '絶対王政の典型', 'ルイ14世が絶対王政の象徴', 1, false, '2025-11-15 17:05:13.78171+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (315, 94, 95, '同時代', '太陽王の異名', 'ルイ14世は太陽王と呼ばれた', 1, false, '2025-11-15 17:05:13.782515+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (316, 94, 114, '対立', '王の贅沢', 'ルイ14世の浪費がフランス革命の遠因', 1, false, '2025-11-15 17:05:13.783963+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (317, 95, 94, '同時代', '同一人物', '太陽王はルイ14世の異名', 1, false, '2025-11-15 17:05:13.785407+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (318, 96, 93, '因果', '島原の乱', 'キリスト教禁止が島原の乱を招く', 1, false, '2025-11-15 17:05:13.786468+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (319, 96, 131, '契機', '尊王攘夷', '鎖国の崩壊が尊王攘夷運動を生む', 1, false, '2025-11-15 17:05:13.7874+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (320, 96, 133, '対立', 'ペリー来航', '鎖国政策に対する外圧', 1, false, '2025-11-15 17:05:13.788129+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (321, 96, 134, '対立', '黒船の衝撃', '鎖国の終焉', 1, false, '2025-11-15 17:05:13.788831+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (322, 96, 136, '因果', '開国', '鎖国から日米和親条約へ', 1, false, '2025-11-15 17:05:13.789686+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (323, 97, 85, '文化', '物理学の確立', 'ニュートンが科学革命を完成', 1, false, '2025-11-15 17:05:13.790373+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (324, 98, 101, '対立', '改革の必要性', '綱吉の失政が吉宗の改革へ', 1, false, '2025-11-15 17:05:13.791168+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (325, 98, 102, '政策', '生類憐みの令', '綱吉が生類憐みの令を発布', 1, false, '2025-11-15 17:05:13.792326+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (326, 98, 106, '契機', '財政悪化', '綱吉の政策が享保の改革を促す', 1, false, '2025-11-15 17:05:13.793226+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (327, 99, 77, '契機', '主権国家体制', 'ウェストファリア条約が絶対王政を強化', 1, false, '2025-11-15 17:05:13.79436+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (328, 99, 77, '政策', '主権国家システム', 'ウェストファリア条約が主権国家を確立', 1, false, '2025-11-15 17:05:13.795632+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (329, 99, 91, '因果', '戦争終結', 'ウェストファリア条約で三十年戦争終結', 1, false, '2025-11-15 17:05:13.796924+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (330, 100, 103, '文化', '三権分立論', '啓蒙思想でモンテスキューが三権分立', 1, false, '2025-11-15 17:05:13.798066+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (331, 100, 104, '文化', '寛容の精神', '啓蒙思想でヴォルテールが宗教批判', 1, false, '2025-11-15 17:05:13.79919+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (332, 100, 105, '文化', '社会契約論', '啓蒙思想でルソーが社会契約論', 1, false, '2025-11-15 17:05:13.800498+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (333, 100, 109, '契機', '合理的思考', '啓蒙思想が産業革命を思想的に支える', 1, false, '2025-11-15 17:05:13.801853+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (334, 100, 112, '契機', '民主主義思想', '啓蒙思想がアメリカ独立革命に影響', 1, false, '2025-11-15 17:05:13.802664+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (335, 100, 114, '契機', '自由・平等思想', '啓蒙思想がフランス革命に影響', 1, false, '2025-11-15 17:05:13.803458+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (336, 100, 133, '文化', '啓蒙思想の影響', '啓蒙思想の自由・平等の理念が開国要求の背景に', 1, false, '2025-11-15 17:05:13.804148+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (337, 101, 106, '因果', '享保の改革', '吉宗が享保の改革を実施', 1, false, '2025-11-15 17:05:13.804834+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (338, 101, 107, '契機', '次世代の政治', '吉宗後に田沼意次が台頭', 1, false, '2025-11-15 17:05:13.805476+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (339, 101, 113, '契機', '改革の継承', '吉宗の改革が寛政の改革へ', 1, false, '2025-11-15 17:05:13.80622+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (340, 102, 98, '因果', '綱吉の政策', '綱吉が生類憐みの令を発布', 1, false, '2025-11-15 17:05:13.806963+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (341, 102, 101, '契機', '改革者の登場', '吉宗が綱吉の政策を転換', 1, false, '2025-11-15 17:05:13.807667+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (342, 102, 106, '契機', '政策転換', '生類憐みの令の反発が享保の改革へ', 1, false, '2025-11-15 17:05:13.808333+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (343, 103, 100, '文化', '政治思想', 'モンテスキューが啓蒙思想を代表', 1, false, '2025-11-15 17:05:13.808997+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (344, 103, 112, '文化', '三権分立', 'モンテスキューがアメリカ建国に影響', 1, false, '2025-11-15 17:05:13.809675+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (345, 104, 100, '文化', '批判精神', 'ヴォルテールが啓蒙思想を代表', 1, false, '2025-11-15 17:05:13.810331+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (346, 105, 100, '文化', '社会思想', 'ルソーが啓蒙思想を代表', 1, false, '2025-11-15 17:05:13.811007+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (347, 105, 114, '文化', '社会契約論', 'ルソーがフランス革命に影響', 1, false, '2025-11-15 17:05:13.811658+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (348, 106, 101, '因果', '徳川吉宗', '吉宗が享保の改革を実施', 1, false, '2025-11-15 17:05:13.812428+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (349, 106, 107, '契機', '次の改革へ', '享保の改革後に田沼意次登場', 1, false, '2025-11-15 17:05:13.813223+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (350, 106, 113, '同時代', '三大改革', '享保・寛政・天保の改革', 1, false, '2025-11-15 17:05:13.814078+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (351, 106, 124, '同時代', '改革の連続性', '享保の改革が天保の改革の先例', 1, false, '2025-11-15 17:05:13.81475+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (352, 107, 108, '対立', '松平定信の改革', '田沼失脚で定信が台頭', 1, false, '2025-11-15 17:05:13.815413+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (353, 107, 113, '契機', '政策転換', '田沼政治への反発が寛政の改革へ', 1, false, '2025-11-15 17:05:13.816264+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (354, 107, 118, '同時代', '経済発展', '田沼時代に化政文化が発展', 1, false, '2025-11-15 17:05:13.81748+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (355, 108, 113, '因果', '寛政の改革', '定信が寛政の改革を実施', 1, false, '2025-11-15 17:05:13.818437+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (356, 108, 115, '同時代', '改革者の系譜', '定信と水野忠邦の改革', 1, false, '2025-11-15 17:05:13.819223+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (357, 108, 118, '対立', '文化統制', '定信の統制に対する庶民文化の反発', 1, false, '2025-11-15 17:05:13.819867+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (358, 109, 111, '文化', '技術革新', '産業革命で蒸気機関が発明される', 1, false, '2025-11-15 17:05:13.820507+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (359, 109, 111, '因果', '動力革命', '産業革命が蒸気機関を実用化', 1, false, '2025-11-15 17:05:13.821177+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (360, 109, 116, '因果', '経済構造の変化', '産業革命が資本主義の発展を生む', 1, false, '2025-11-15 17:05:13.82183+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (361, 109, 134, '文化', '蒸気機関の技術', '産業革命の技術的成果である蒸気船が黒船として来航', 1, false, '2025-11-15 17:05:13.822795+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (362, 109, 142, '契機', '工業化の波及', '産業革命がアメリカにも波及し南北戦争後加速', 1, false, '2025-11-15 17:05:13.823554+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (363, 109, 151, '契機', '工業力の拡大', '産業革命が帝国主義を支える', 1, false, '2025-11-15 17:05:13.824269+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (364, 109, 204, '同時代', '技術革新', '産業革命とIT革命の技術変革の共通性', 1, false, '2025-11-15 17:05:13.824924+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (365, 110, 114, '対立', '革命の理念vs独裁', 'ナポレオンがフランス革命の理念を裏切る', 1, false, '2025-11-15 17:05:13.825567+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (366, 110, 117, '契機', 'ナポレオンの野望', 'ナポレオンがヨーロッパ征服戦争', 1, false, '2025-11-15 17:05:13.82619+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (367, 110, 120, '対立', 'ナポレオンvs保守勢力', 'ナポレオンがウィーン会議で否定される', 1, false, '2025-11-15 17:05:13.826868+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (368, 111, 109, '文化', '動力革命', '蒸気機関が産業革命を象徴', 1, false, '2025-11-15 17:05:13.827477+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (369, 111, 151, '契機', '輸送革命', '蒸気機関が帝国主義の軍事・交通を支える', 1, false, '2025-11-15 17:05:13.828093+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (370, 112, 114, '契機', '革命の連鎖', 'アメリカ独立革命がフランス革命に影響', 1, false, '2025-11-15 17:05:13.828717+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (371, 112, 116, '契機', '自由主義経済', 'アメリカ独立が資本主義を促進', 1, false, '2025-11-15 17:05:13.829444+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (372, 113, 106, '同時代', '改革の連続性', '享保・寛政・天保の改革', 1, false, '2025-11-15 17:05:13.830118+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (373, 113, 108, '因果', '松平定信', '定信が寛政の改革を実施', 1, false, '2025-11-15 17:05:13.830845+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (374, 113, 118, '同時代', '文化統制', '寛政の改革が化政文化を抑圧', 1, false, '2025-11-15 17:05:13.831606+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (375, 113, 124, '同時代', '三大改革', '寛政の改革が天保の改革の先例', 1, false, '2025-11-15 17:05:13.832358+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (376, 114, 110, '因果', '革命の英雄', 'フランス革命の混乱でナポレオン台頭', 1, false, '2025-11-15 17:05:13.833489+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (377, 114, 110, '契機', '革命の混乱', 'フランス革命の混乱からナポレオン登場', 1, false, '2025-11-15 17:05:13.834593+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (378, 114, 116, '契機', 'ブルジョワ革命', 'フランス革命が資本主義を促進', 1, false, '2025-11-15 17:05:13.835403+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (379, 115, 108, '同時代', '改革者の系譜', '松平定信と水野忠邦', 1, false, '2025-11-15 17:05:13.836197+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (380, 115, 124, '因果', '天保の改革', '忠邦が天保の改革を実施', 1, false, '2025-11-15 17:05:13.836946+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (381, 115, 133, '契機', '改革失敗', '忠邦失脚後にペリー来航', 1, false, '2025-11-15 17:05:13.837699+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (382, 116, 123, '契機', '労働者問題', '資本主義の矛盾をマルクスが批判', 1, false, '2025-11-15 17:05:13.838522+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (383, 116, 151, '契機', '市場拡大の必要', '資本主義が帝国主義を生む', 1, false, '2025-11-15 17:05:13.839192+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (384, 117, 110, '契機', 'ナポレオンの拡大', 'ナポレオンがナポレオン戦争を起こす', 1, false, '2025-11-15 17:05:13.839876+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (385, 117, 120, '因果', '戦後処理', 'ナポレオン戦争後にウィーン会議', 1, false, '2025-11-15 17:05:13.840537+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (386, 117, 141, '契機', 'ナポレオン支配への反発', 'ナポレオン戦争がイタリア民族意識を高める', 1, false, '2025-11-15 17:05:13.841227+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (387, 117, 153, '契機', 'ナポレオン支配への反発', 'ナポレオン戦争がドイツ民族意識を高める', 1, false, '2025-11-15 17:05:13.841859+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (388, 118, 113, '対立', '改革vs文化', '化政文化が寛政の改革に反発', 1, false, '2025-11-15 17:05:13.842486+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (389, 118, 124, '契機', '文化統制', '化政文化の繁栄が天保の改革を促す', 1, false, '2025-11-15 17:05:13.843137+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (390, 118, 133, '同時代', '開国前夜', '化政文化がペリー来航前の繁栄', 1, false, '2025-11-15 17:05:13.843827+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (391, 119, 116, '政策', '自由労働力', 'リンカーンの奴隷解放が資本主義を促進', 1, false, '2025-11-15 17:05:13.84481+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (392, 119, 142, '政策', '奴隷解放', 'リンカーンが南北戦争で奴隷解放', 1, false, '2025-11-15 17:05:13.845799+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (393, 120, 114, '対立', '保守反動', 'ウィーン会議がフランス革命を否定', 1, false, '2025-11-15 17:05:13.846738+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (394, 120, 129, '因果', '反動体制への反発', 'ウィーン会議の保守反動が二月革命を招く', 1, false, '2025-11-15 17:05:13.847643+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (395, 120, 130, '因果', '反動体制の確立', 'ウィーン会議がウィーン体制を作る', 1, false, '2025-11-15 17:05:13.848232+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (396, 120, 203, '同時代', 'ヨーロッパ統合の系譜', 'ウィーン会議からEU発足までの統合の歴史', 1, false, '2025-11-15 17:05:13.848827+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (397, 121, 131, '対立', '尊王攘夷vs幕府', '井伊が尊王攘夷派を弾圧', 1, false, '2025-11-15 17:05:13.849705+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (398, 121, 138, '因果', '条約調印', '井伊が日米修好通商条約調印', 1, false, '2025-11-15 17:05:13.851047+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (399, 121, 139, '因果', '安政の大獄', '井伊が反対派を弾圧', 1, false, '2025-11-15 17:05:13.852011+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (400, 121, 140, '因果', '桜田門外の変', '井伊が暗殺される', 1, false, '2025-11-15 17:05:13.852727+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (401, 121, 143, '契機', '倒幕運動', '井伊の死後に薩長同盟へ', 1, false, '2025-11-15 17:05:13.853665+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (402, 122, 141, '同時代', '統一政策', 'ビスマルクとイタリア統一は同時代', 1, false, '2025-11-15 17:05:13.854637+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (403, 122, 151, '政策', '植民地政策', 'ビスマルクが帝国主義政策を推進', 1, false, '2025-11-15 17:05:13.855535+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (404, 122, 153, '政策', '鉄血政策', 'ビスマルクがドイツ統一を実現', 1, false, '2025-11-15 17:05:13.856373+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (405, 123, 116, '対立', '社会主義vs資本主義', 'マルクスが資本主義を批判', 1, false, '2025-11-15 17:05:13.857033+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (406, 123, 128, '文化', '社会主義思想', 'マルクスが共産党宣言を発表', 1, false, '2025-11-15 17:05:13.857628+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (407, 123, 171, '契機', '社会主義思想', 'マルクス思想がロシア革命に影響', 1, false, '2025-11-15 17:05:13.858211+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (408, 124, 106, '同時代', '三大改革', '享保・寛政・天保の改革', 1, false, '2025-11-15 17:05:13.858837+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (409, 124, 115, '因果', '水野忠邦', '忠邦が天保の改革を実施', 1, false, '2025-11-15 17:05:13.859585+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (410, 124, 131, '契機', '幕府の弱体化', '天保の改革失敗が尊王攘夷運動へ', 1, false, '2025-11-15 17:05:13.860224+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (411, 124, 133, '契機', '外圧への対応', '天保の改革の失敗がペリー来航の危機へ', 1, false, '2025-11-15 17:05:13.860867+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (412, 125, 143, '因果', '薩長同盟仲介', '龍馬が薩長同盟を仲介', 1, false, '2025-11-15 17:05:13.861451+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (413, 125, 144, '契機', '大政奉還の提案', '龍馬が大政奉還を提案', 1, false, '2025-11-15 17:05:13.862049+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (414, 125, 147, '契機', '明治維新の準備', '龍馬が明治維新を準備', 1, false, '2025-11-15 17:05:13.862679+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (415, 126, 132, '因果', '清朝の弱体化', 'アヘン戦争敗北が大規模反乱を招く', 1, false, '2025-11-15 17:05:13.863294+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (416, 126, 133, '契機', 'アジア進出の波', 'アヘン戦争での欧米勝利がアジア進出を加速、ペリー来航へ', 1, false, '2025-11-15 17:05:13.863887+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (417, 126, 151, '同時代', 'アジア侵略', 'アヘン戦争も帝国主義の一環', 1, false, '2025-11-15 17:05:13.864452+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (418, 126, 167, '因果', '列強の侵略', 'アヘン戦争後の半植民地化が革命の背景に', 1, false, '2025-11-15 17:05:13.865001+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (419, 126, 169, '契機', 'アジア対立', 'アヘン戦争が列強対立の始まり', 1, false, '2025-11-15 17:05:13.86555+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (420, 127, 157, '対立', '民権派との対立', '伊藤が自由民権運動と対立', 1, false, '2025-11-15 17:05:13.866956+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (421, 127, 159, '因果', '憲法起草', '伊藤が大日本帝国憲法を起草', 1, false, '2025-11-15 17:05:13.868211+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (422, 127, 161, '因果', '初代首相', '伊藤が初代内閣総理大臣', 1, false, '2025-11-15 17:05:13.869273+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (423, 127, 166, '因果', '韓国併合', '伊藤が韓国統監として韓国併合を推進', 1, false, '2025-11-15 17:05:13.870081+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (424, 128, 116, '対立', '革命の呼びかけ', '共産党宣言が資本主義打倒を訴える', 1, false, '2025-11-15 17:05:13.870706+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (425, 128, 171, '契機', '革命の理論', '共産党宣言がロシア革命の理論的基礎', 1, false, '2025-11-15 17:05:13.871296+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (426, 129, 120, '因果', 'ウィーン体制の崩壊', '二月革命でウィーン体制が崩れる', 1, false, '2025-11-15 17:05:13.871956+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (427, 129, 120, '対立', '革命vs反動', '二月革命がウィーン会議体制に反発', 1, false, '2025-11-15 17:05:13.872565+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (428, 129, 141, '契機', '民族運動の高揚', '二月革命がイタリア統一を促進', 1, false, '2025-11-15 17:05:13.873242+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (429, 129, 153, '契機', '民族運動の高揚', '二月革命がドイツ統一を促進', 1, false, '2025-11-15 17:05:13.87386+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (430, 130, 120, '因果', '体制の崩壊', 'ウィーン体制崩壊はウィーン会議の否定', 1, false, '2025-11-15 17:05:13.874457+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (431, 130, 129, '同時代', '自由主義革命', 'ウィーン体制崩壊と二月革命は同じ', 1, false, '2025-11-15 17:05:13.875054+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (432, 130, 141, '因果', '自由主義の波及', 'ウィーン体制崩壊でイタリア統一加速', 1, false, '2025-11-15 17:05:13.875637+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (433, 130, 153, '因果', '自由主義の波及', 'ウィーン体制崩壊でドイツ統一加速', 1, false, '2025-11-15 17:05:13.876231+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (434, 131, 125, '同時代', '坂本龍馬の活動', '龍馬が尊王攘夷派を調整', 1, false, '2025-11-15 17:05:13.876903+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (435, 131, 143, '因果', '薩長同盟', '尊王攘夷派が薩長同盟を結成', 1, false, '2025-11-15 17:05:13.8775+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (436, 131, 144, '契機', '大政奉還', '尊王攘夷運動が大政奉還を促す', 1, false, '2025-11-15 17:05:13.878102+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (437, 131, 145, '因果', '王政復古', '尊王攘夷が王政復古の大号令へ', 1, false, '2025-11-15 17:05:13.878661+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (438, 131, 146, '因果', '戊辰戦争', '尊王攘夷派が戊辰戦争を戦う', 1, false, '2025-11-15 17:05:13.8792+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (439, 132, 167, '契機', '清朝崩壊への道', '太平天国の乱が清朝の弱体化を加速', 1, false, '2025-11-15 17:05:13.879741+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (440, 133, 121, '契機', '井伊直弼の登場', 'ペリー来航の混乱で井伊が台頭', 1, false, '2025-11-15 17:05:13.880278+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (441, 133, 131, '契機', '尊王攘夷運動', 'ペリー来航が尊王攘夷を激化', 1, false, '2025-11-15 17:05:13.880829+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (442, 133, 134, '同時代', '黒船', 'ペリーが黒船で来航', 1, false, '2025-11-15 17:05:13.881393+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (443, 133, 136, '因果', '日米和親条約', 'ペリー来航で開国', 1, false, '2025-11-15 17:05:13.881979+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (444, 133, 138, '因果', '不平等条約', 'ペリー来航が日米修好通商条約へ', 1, false, '2025-11-15 17:05:13.882772+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (445, 134, 131, '契機', '攘夷運動', '黒船が尊王攘夷運動を激化', 1, false, '2025-11-15 17:05:13.884954+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (446, 134, 133, '同時代', 'ペリー来航', '黒船でペリーが来航', 1, false, '2025-11-15 17:05:13.886145+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (447, 134, 136, '因果', '開国', '黒船の圧力で日米和親条約', 1, false, '2025-11-15 17:05:13.887168+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (448, 135, 120, '契機', 'ウィーン体制の限界', 'クリミア戦争がウィーン体制を動揺させる', 1, false, '2025-11-15 17:05:13.887892+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (449, 135, 151, '同時代', '領土拡大競争', 'クリミア戦争も帝国主義時代の戦争', 1, false, '2025-11-15 17:05:13.888539+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (450, 135, 169, '契機', 'バルカン問題', 'クリミア戦争が第一次世界大戦の遠因', 1, false, '2025-11-15 17:05:13.889166+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (451, 136, 96, '因果', '鎖国の終焉', '日米和親条約で鎖国が終わる', 1, false, '2025-11-15 17:05:13.889809+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (452, 136, 121, '契機', '井伊直弼の台頭', '条約締結で井伊が権力掌握', 1, false, '2025-11-15 17:05:13.890417+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (453, 136, 131, '契機', '尊王攘夷激化', '開国が尊王攘夷運動を激化', 1, false, '2025-11-15 17:05:13.890986+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (454, 136, 138, '因果', '不平等条約', '日米和親条約から修好通商条約へ', 1, false, '2025-11-15 17:05:13.891869+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (455, 137, 168, '因果', '大正デモクラシー', '原敬が大正デモクラシーを主導', 1, false, '2025-11-15 17:05:13.892823+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (456, 137, 177, '因果', '普通選挙法', '原敬が普通選挙法を推進', 1, false, '2025-11-15 17:05:13.893723+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (457, 137, 181, '契機', '五・一五事件', '原敬暗殺が五・一五事件の先駆', 1, false, '2025-11-15 17:05:13.894611+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (458, 138, 121, '因果', '井伊直弼の調印', '井伊が勅許なしで条約調印', 1, false, '2025-11-15 17:05:13.895177+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (459, 138, 131, '契機', '尊王攘夷激化', '不平等条約が尊王攘夷を激化', 1, false, '2025-11-15 17:05:13.895739+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (460, 138, 139, '因果', '安政の大獄', '条約調印への反発が大獄を招く', 1, false, '2025-11-15 17:05:13.896311+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (461, 138, 147, '契機', '明治維新の遠因', '不平等条約が明治維新の動機', 1, false, '2025-11-15 17:05:13.896901+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (462, 139, 121, '因果', '井伊の弾圧', '井伊が安政の大獄を実施', 1, false, '2025-11-15 17:05:13.897461+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (463, 139, 131, '契機', '尊王攘夷激化', '大獄が尊王攘夷運動を激化', 1, false, '2025-11-15 17:05:13.898031+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (464, 139, 140, '因果', '桜田門外の変', '大獄への復讐で井伊暗殺', 1, false, '2025-11-15 17:05:13.898581+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (465, 139, 143, '契機', '倒幕への転換', '大獄が薩長同盟を促す', 1, false, '2025-11-15 17:05:13.899266+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (466, 140, 121, '因果', '井伊の暗殺', '井伊が桜田門外の変で暗殺', 1, false, '2025-11-15 17:05:13.900625+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (467, 140, 131, '契機', '尊王攘夷の高揚', '井伊暗殺で尊王攘夷が激化', 1, false, '2025-11-15 17:05:13.902256+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (468, 140, 143, '契機', '倒幕運動加速', '幕府の威信失墜で薩長同盟へ', 1, false, '2025-11-15 17:05:13.903077+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (469, 140, 144, '契機', '幕府の弱体化', '桜田門外の変が大政奉還を促す', 1, false, '2025-11-15 17:05:13.903746+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (470, 141, 130, '契機', '民族主義の高揚', 'ウィーン体制崩壊でイタリア統一運動', 1, false, '2025-11-15 17:05:13.904364+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (471, 141, 151, '契機', '統一後の拡大', 'イタリア統一後に帝国主義へ', 1, false, '2025-11-15 17:05:13.905005+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (472, 141, 153, '同時代', '統一運動', 'イタリアとドイツの統一は同時期', 1, false, '2025-11-15 17:05:13.905595+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (473, 142, 116, '契機', '資本主義の拡大', '南北戦争後にアメリカ資本主義が発展', 1, false, '2025-11-15 17:05:13.906237+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (474, 142, 119, '文化', '戦時大統領', '南北戦争でリンカーンがアメリカを統率', 1, false, '2025-11-15 17:05:13.906832+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (475, 142, 151, '契機', 'アメリカの台頭', '南北戦争後にアメリカが帝国主義へ', 1, false, '2025-11-15 17:05:13.907417+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (476, 143, 125, '因果', '坂本龍馬の仲介', '龍馬が薩長同盟を仲介', 1, false, '2025-11-15 17:05:13.907986+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (477, 143, 144, '因果', '大政奉還', '薩長同盟が大政奉還を促す', 1, false, '2025-11-15 17:05:13.908553+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (478, 143, 145, '因果', '王政復古', '薩長同盟が王政復古の大号令へ', 1, false, '2025-11-15 17:05:13.909125+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (479, 143, 146, '因果', '戊辰戦争', '薩長同盟が戊辰戦争を主導', 1, false, '2025-11-15 17:05:13.909709+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (480, 143, 147, '因果', '明治維新', '薩長同盟が明治維新を実現', 1, false, '2025-11-15 17:05:13.910279+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (481, 144, 89, '因果', '江戸幕府の終焉', '大政奉還で江戸幕府が終わる', 1, false, '2025-11-15 17:05:13.910871+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (482, 144, 125, '因果', '龍馬の提案', '龍馬が大政奉還を提案', 1, false, '2025-11-15 17:05:13.91145+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (483, 144, 145, '因果', '王政復古の大号令', '大政奉還後に王政復古', 1, false, '2025-11-15 17:05:13.912037+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (484, 144, 146, '因果', '戊辰戦争', '大政奉還が戊辰戦争を招く', 1, false, '2025-11-15 17:05:13.912881+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (485, 144, 147, '因果', '明治維新', '大政奉還が明治維新の始まり', 1, false, '2025-11-15 17:05:13.913521+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (486, 145, 144, '因果', '大政奉還後', '大政奉還後に王政復古', 1, false, '2025-11-15 17:05:13.91413+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (487, 145, 146, '因果', '戊辰戦争', '王政復古の大号令が戊辰戦争を招く', 1, false, '2025-11-15 17:05:13.914821+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (488, 145, 147, '因果', '明治維新', '王政復古の大号令が明治維新へ', 1, false, '2025-11-15 17:05:13.915543+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (489, 145, 152, '因果', '中央集権化', '王政復古が廃藩置県へ', 1, false, '2025-11-15 17:05:13.916733+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (490, 146, 147, '因果', '明治維新', '戊辰戦争の勝利で明治維新実現', 1, false, '2025-11-15 17:05:13.918238+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (491, 146, 148, '契機', '富国強兵', '戊辰戦争の経験が富国強兵へ', 1, false, '2025-11-15 17:05:13.919107+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (492, 146, 152, '因果', '廃藩置県', '戊辰戦争後に廃藩置県', 1, false, '2025-11-15 17:05:13.919793+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (493, 146, 155, '契機', '徴兵令', '戊辰戦争の経験が徴兵令へ', 1, false, '2025-11-15 17:05:13.920477+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (494, 147, 148, '政策', '富国強兵', '明治維新で富国強兵推進', 1, false, '2025-11-15 17:05:13.921156+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (495, 147, 149, '政策', '殖産興業', '明治維新で殖産興業推進', 1, false, '2025-11-15 17:05:13.921793+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (496, 147, 150, '因果', '版籍奉還', '明治維新で版籍奉還実施', 1, false, '2025-11-15 17:05:13.92244+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (497, 147, 152, '因果', '廃藩置県', '明治維新で廃藩置県実施', 1, false, '2025-11-15 17:05:13.923092+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (498, 147, 157, '契機', '自由民権運動', '明治維新後に自由民権運動', 1, false, '2025-11-15 17:05:13.92373+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (499, 148, 149, '同時代', '経済と軍事', '富国強兵と殖産興業', 1, false, '2025-11-15 17:05:13.924414+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (500, 148, 154, '政策', '学制', '富国強兵のため学制実施', 1, false, '2025-11-15 17:05:13.925041+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (501, 148, 155, '政策', '徴兵令', '富国強兵のため徴兵令実施', 1, false, '2025-11-15 17:05:13.925645+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (502, 148, 162, '因果', '日清戦争', '富国強兵の成果', 1, false, '2025-11-15 17:05:13.92626+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (503, 148, 164, '因果', '日露戦争', '富国強兵の成果', 1, false, '2025-11-15 17:05:13.926857+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (504, 149, 148, '同時代', '富国強兵', '殖産興業と富国強兵', 1, false, '2025-11-15 17:05:13.927485+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (505, 149, 154, '政策', '学制', '殖産興業のため学制実施', 1, false, '2025-11-15 17:05:13.928107+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (506, 149, 156, '因果', '地租改正', '殖産興業のため地租改正', 1, false, '2025-11-15 17:05:13.928712+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (507, 149, 196, '因果', '高度経済成長', '殖産興業が高度経済成長の基礎', 1, false, '2025-11-15 17:05:13.92939+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (508, 150, 147, '因果', '明治維新', '明治維新で版籍奉還実施', 1, false, '2025-11-15 17:05:13.930039+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (509, 150, 148, '契機', '中央集権化', '版籍奉還が富国強兵の基盤', 1, false, '2025-11-15 17:05:13.930681+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (510, 150, 152, '因果', '廃藩置県', '版籍奉還が廃藩置県の前段階', 1, false, '2025-11-15 17:05:13.931309+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (511, 151, 109, '契機', '産業力の拡大', '産業革命が帝国主義を生む', 1, false, '2025-11-15 17:05:13.93195+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (512, 151, 158, '政策', '植民地獲得競争', '帝国主義がアフリカ分割を引き起こす', 1, false, '2025-11-15 17:05:13.932867+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (513, 151, 169, '契機', '帝国主義対立の激化', '帝国主義が第一次世界大戦を招く', 1, false, '2025-11-15 17:05:13.934568+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (514, 151, 170, '契機', '帝国主義対立の爆発', '帝国主義列強の対立がサラエボ事件を引き起こす', 1, false, '2025-11-15 17:05:13.9358+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (515, 152, 147, '因果', '明治維新', '明治維新で廃藩置県実施', 1, false, '2025-11-15 17:05:13.936675+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (516, 152, 148, '因果', '富国強兵', '廃藩置県が富国強兵を可能に', 1, false, '2025-11-15 17:05:13.937707+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (517, 152, 150, '同時代', '中央集権化', '版籍奉還と廃藩置県', 1, false, '2025-11-15 17:05:13.938667+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (518, 152, 156, '因果', '地租改正', '廃藩置県が地租改正を促す', 1, false, '2025-11-15 17:05:13.939672+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (519, 153, 130, '契機', '民族主義の高揚', 'ウィーン体制崩壊でドイツ統一運動', 1, false, '2025-11-15 17:05:13.940647+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (520, 153, 151, '契機', '統一後の拡大', 'ドイツ統一後に帝国主義へ', 1, false, '2025-11-15 17:05:13.941332+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (521, 154, 148, '因果', '富国強兵', '学制が富国強兵を支える', 1, false, '2025-11-15 17:05:13.941967+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (522, 154, 155, '同時代', '制度整備', '学制と徴兵令', 1, false, '2025-11-15 17:05:13.942622+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (523, 154, 157, '契機', '教育と民権', '学制が自由民権運動を促す', 1, false, '2025-11-15 17:05:13.943263+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (524, 155, 148, '因果', '富国強兵', '徴兵令が富国強兵を実現', 1, false, '2025-11-15 17:05:13.943892+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (525, 155, 162, '因果', '日清戦争', '徴兵令が日清戦争を可能に', 1, false, '2025-11-15 17:05:13.944589+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (526, 155, 164, '因果', '日露戦争', '徴兵令が日露戦争を可能に', 1, false, '2025-11-15 17:05:13.945332+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (527, 155, 185, '因果', '太平洋戦争', '徴兵令が太平洋戦争へ', 1, false, '2025-11-15 17:05:13.94609+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (528, 156, 148, '因果', '富国強兵', '地租改正が富国強兵を支える', 1, false, '2025-11-15 17:05:13.946799+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (529, 156, 149, '因果', '殖産興業', '地租改正が殖産興業を支える', 1, false, '2025-11-15 17:05:13.947466+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (530, 156, 157, '契機', '自由民権運動', '地租改正への不満が民権運動へ', 1, false, '2025-11-15 17:05:13.948082+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (531, 157, 127, '対立', '伊藤博文', '民権派vs伊藤博文', 1, false, '2025-11-15 17:05:13.948739+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (532, 157, 147, '因果', '明治維新の反動', '明治維新後に自由民権運動', 1, false, '2025-11-15 17:05:13.949573+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (533, 157, 159, '因果', '大日本帝国憲法', '自由民権運動が憲法制定を促す', 1, false, '2025-11-15 17:05:13.951185+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (534, 157, 161, '因果', '帝国議会', '自由民権運動が議会開設を実現', 1, false, '2025-11-15 17:05:13.952322+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (535, 157, 168, '同時代', '民主化の流れ', '自由民権運動が大正デモクラシーへ', 1, false, '2025-11-15 17:05:13.953068+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (536, 158, 126, '同時代', '植民地獲得競争', 'アフリカ分割とアヘン戦争は同じ帝国主義', 1, false, '2025-11-15 17:05:13.953731+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (537, 158, 169, '契機', '植民地対立', 'アフリカ分割が第一次世界大戦の遠因', 1, false, '2025-11-15 17:05:13.954431+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (538, 159, 127, '因果', '伊藤博文', '伊藤が憲法を起草', 1, false, '2025-11-15 17:05:13.955051+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (539, 159, 157, '因果', '自由民権運動', '民権運動が憲法制定を促す', 1, false, '2025-11-15 17:05:13.955698+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (540, 159, 161, '因果', '帝国議会', '憲法で帝国議会を設置', 1, false, '2025-11-15 17:05:13.956316+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (541, 159, 193, '対立', '日本国憲法', '大日本帝国憲法から日本国憲法へ', 1, false, '2025-11-15 17:05:13.956933+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (542, 160, 173, '契機', '独裁者の登場', 'ヒトラーがファシズム台頭の象徴', 1, false, '2025-11-15 17:05:13.957558+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (543, 160, 182, '同時代', 'ナチス指導者', 'ヒトラーがナチス・ドイツを率いる', 1, false, '2025-11-15 17:05:13.958152+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (544, 160, 185, '契機', 'ドイツの侵略', 'ヒトラーが第二次世界大戦を開始', 1, false, '2025-11-15 17:05:13.958754+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (545, 161, 127, '因果', '伊藤博文', '伊藤が帝国議会を設置', 1, false, '2025-11-15 17:05:13.959356+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (546, 161, 159, '因果', '憲法に基づく', '大日本帝国憲法で帝国議会設置', 1, false, '2025-11-15 17:05:13.959958+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (547, 161, 168, '同時代', '議会政治', '帝国議会が大正デモクラシーの基盤', 1, false, '2025-11-15 17:05:13.960701+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (548, 162, 148, '因果', '富国強兵の成果', '富国強兵が日清戦争を可能に', 1, false, '2025-11-15 17:05:13.961459+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (549, 162, 163, '因果', '下関条約', '日清戦争の勝利で下関条約', 1, false, '2025-11-15 17:05:13.962144+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (550, 162, 164, '契機', '日露戦争', '日清戦争の勝利が日露戦争へ', 1, false, '2025-11-15 17:05:13.962797+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (551, 162, 166, '契機', '韓国併合', '日清戦争が韓国併合の契機', 1, false, '2025-11-15 17:05:13.963489+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (552, 162, 169, '同時代', '帝国主義', '日清戦争が第一次世界大戦へ', 1, false, '2025-11-15 17:05:13.964108+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (553, 163, 162, '因果', '日清戦争', '日清戦争の勝利で下関条約', 1, false, '2025-11-15 17:05:13.964729+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (554, 163, 164, '契機', '日露戦争', '下関条約が日露戦争の遠因', 1, false, '2025-11-15 17:05:13.96539+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (555, 163, 166, '契機', '韓国併合', '下関条約が韓国併合を促す', 1, false, '2025-11-15 17:05:13.966305+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (556, 164, 148, '因果', '富国強兵の成果', '富国強兵が日露戦争を可能に', 1, false, '2025-11-15 17:05:13.967765+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (557, 164, 151, '対立', '帝国主義対立', '日露戦争が帝国主義列強の対立', 1, false, '2025-11-15 17:05:13.968959+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (558, 164, 162, '因果', '日清戦争の延長', '日清戦争が日露戦争へ', 1, false, '2025-11-15 17:05:13.970038+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (559, 164, 165, '因果', 'ポーツマス条約', '日露戦争の勝利でポーツマス条約', 1, false, '2025-11-15 17:05:13.970721+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (560, 164, 166, '因果', '韓国併合', '日露戦争の勝利で韓国併合', 1, false, '2025-11-15 17:05:13.971455+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (561, 164, 169, '契機', '第一次世界大戦', '日露戦争が第一次世界大戦へ', 1, false, '2025-11-15 17:05:13.972112+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (562, 165, 164, '因果', '日露戦争', '日露戦争の勝利でポーツマス条約', 1, false, '2025-11-15 17:05:13.97282+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (563, 165, 166, '因果', '韓国併合', 'ポーツマス条約が韓国併合を促す', 1, false, '2025-11-15 17:05:13.973478+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (564, 165, 169, '契機', '国際的地位', 'ポーツマス条約が第一次世界大戦参戦へ', 1, false, '2025-11-15 17:05:13.974102+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (565, 166, 164, '因果', '日露戦争', '日露戦争の勝利で韓国併合', 1, false, '2025-11-15 17:05:13.974712+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (566, 166, 169, '同時代', '帝国主義', '韓国併合と第一次世界大戦', 1, false, '2025-11-15 17:05:13.975323+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (567, 166, 180, '契機', '満州事変', '韓国併合が満州事変の基盤', 1, false, '2025-11-15 17:05:13.976035+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (568, 166, 184, '契機', '日中戦争', '韓国併合が日中戦争の遠因', 1, false, '2025-11-15 17:05:13.976754+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (569, 167, 184, '因果', '中国の混乱', '辛亥革命後の政治混乱が日中戦争の背景に', 1, false, '2025-11-15 17:05:13.977456+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (570, 167, 205, '同時代', '中国の変遷', '辛亥革命から香港返還までの中国の変化', 1, false, '2025-11-15 17:05:13.978124+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (571, 168, 137, '因果', '原敬', '原敬が大正デモクラシーを主導', 1, false, '2025-11-15 17:05:13.978773+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (572, 168, 157, '同時代', '民主化の流れ', '自由民権運動から大正デモクラシーへ', 1, false, '2025-11-15 17:05:13.979461+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (573, 168, 169, '因果', '第一次世界大戦', '第一次世界大戦が大正デモクラシーを促進', 1, false, '2025-11-15 17:05:13.980098+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (574, 168, 177, '因果', '普通選挙法', '大正デモクラシーで普通選挙法', 1, false, '2025-11-15 17:05:13.980711+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (575, 168, 178, '対立', '治安維持法', '大正デモクラシーと治安維持法', 1, false, '2025-11-15 17:05:13.981349+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (576, 169, 166, '同時代', '帝国主義', '韓国併合と第一次世界大戦', 1, false, '2025-11-15 17:05:13.981951+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (577, 169, 168, '因果', '大正デモクラシー', '第一次世界大戦が大正デモクラシーを促進', 1, false, '2025-11-15 17:05:13.982666+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (578, 169, 170, '契機', '戦争の引き金', 'サラエボ事件で第一次世界大戦開戦', 1, false, '2025-11-15 17:05:13.98394+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (579, 169, 171, '契機', '戦争の疲弊', '第一次世界大戦がロシア革命を引き起こす', 1, false, '2025-11-15 17:05:13.985451+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (580, 169, 172, '因果', '戦後処理', '第一次世界大戦後にヴェルサイユ条約', 1, false, '2025-11-15 17:05:13.986639+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (581, 169, 174, '契機', '平和への願い', '第一次世界大戦の惨禍が国際連盟を生む', 1, false, '2025-11-15 17:05:13.987678+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (582, 169, 175, '因果', '戦後の軍縮', '第一次世界大戦後の国際軍縮の試み', 1, false, '2025-11-15 17:05:13.988709+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (583, 169, 179, '因果', '世界恐慌', '第一次世界大戦が世界恐慌の遠因', 1, false, '2025-11-15 17:05:13.989368+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (584, 169, 180, '契機', '満州事変', '第一次世界大戦後の混乱が満州事変へ', 1, false, '2025-11-15 17:05:13.990007+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (585, 169, 185, '契機', '太平洋戦争', '第一次世界大戦が太平洋戦争へ', 1, false, '2025-11-15 17:05:13.990618+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (586, 170, 169, '契機', '開戦の契機', 'サラエボ事件が第一次世界大戦の引き金', 1, false, '2025-11-15 17:05:13.991393+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (587, 171, 123, '契機', 'マルクス主義の実践', 'ロシア革命がマルクス思想を実現', 1, false, '2025-11-15 17:05:13.992077+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (588, 171, 128, '契機', '社会主義革命', 'ロシア革命が共産党宣言を実現', 1, false, '2025-11-15 17:05:13.992768+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (589, 171, 173, '契機', '共産主義への恐怖', 'ロシア革命がファシズム台頭の一因', 1, false, '2025-11-15 17:05:13.993469+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (590, 171, 194, '契機', '社会主義vs資本主義', 'ロシア革命が冷戦の一因', 1, false, '2025-11-15 17:05:13.994102+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (591, 172, 169, '外交', '戦後処理', 'ヴェルサイユ条約で日本は戦勝国として参加', 1, false, '2025-11-15 17:05:13.994711+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (592, 172, 173, '契機', '民族自決の裏切り', 'ヴェルサイユ条約がドイツを不満にさせる', 1, false, '2025-11-15 17:05:13.995349+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (593, 172, 174, '政策', '国際平和機構', 'ヴェルサイユ条約で国際連盟設立', 1, false, '2025-11-15 17:05:13.995967+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (594, 172, 179, '契機', '過酷な賠償', 'ヴェルサイユ条約がドイツ経済を圧迫', 1, false, '2025-11-15 17:05:13.996588+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (595, 172, 185, '契機', '不満の蓄積', 'ヴェルサイユ条約が第二次世界大戦の遠因', 1, false, '2025-11-15 17:05:13.997194+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (596, 173, 160, '同時代', '独裁の時代', 'ファシズム台頭とヒトラーは同じ', 1, false, '2025-11-15 17:05:13.997802+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (597, 173, 180, '契機', 'ファシズムの波', '世界的なファシズムの台頭が満州事変を後押し', 1, false, '2025-11-15 17:05:13.998444+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (598, 173, 182, '同時代', 'ファシズム国家', 'ファシズムの台頭でナチス・ドイツ成立', 1, false, '2025-11-15 17:05:13.999367+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (599, 173, 183, '契機', '軍部台頭', 'ファシズムの台頭が日本の二・二六事件に影響', 1, false, '2025-11-15 17:05:14.000525+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (600, 173, 185, '契機', 'ファシズムの侵略', 'ファシズムが第二次世界大戦を引き起こす', 1, false, '2025-11-15 17:05:14.002382+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (601, 174, 185, '因果', '無力な平和機構', '国際連盟が第二次世界大戦を防げず', 1, false, '2025-11-15 17:05:14.003766+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (602, 174, 192, '契機', '失敗からの教訓', '国際連盟の失敗が国際連合設立の動機', 1, false, '2025-11-15 17:05:14.004401+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (603, 175, 180, '因果', '軍縮体制の崩壊', 'ワシントン体制の破綻が満州事変を招く', 1, false, '2025-11-15 17:05:14.005106+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (604, 176, 179, '契機', '経済混乱', '関東大震災が世界恐慌の影響を拡大', 1, false, '2025-11-15 17:05:14.005719+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (605, 176, 180, '契機', '軍部台頭', '関東大震災の混乱が満州事変へ', 1, false, '2025-11-15 17:05:14.00643+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (606, 176, 181, '契機', '社会不安', '関東大震災が五・一五事件の背景', 1, false, '2025-11-15 17:05:14.007161+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (607, 177, 137, '因果', '原敬', '原敬が普通選挙法を推進', 1, false, '2025-11-15 17:05:14.007839+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (608, 177, 168, '因果', '大正デモクラシー', '大正デモクラシーで普通選挙法', 1, false, '2025-11-15 17:05:14.008465+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (609, 177, 178, '同時代', '治安維持法', '普通選挙法と治安維持法が同時制定', 1, false, '2025-11-15 17:05:14.009072+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (610, 177, 193, '契機', '日本国憲法', '普通選挙法が日本国憲法の基盤', 1, false, '2025-11-15 17:05:14.009691+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (611, 178, 177, '対立', '普通選挙法', '治安維持法が普通選挙法と同時制定', 1, false, '2025-11-15 17:05:14.010273+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (612, 178, 181, '因果', '五・一五事件', '治安維持法が五・一五事件の背景', 1, false, '2025-11-15 17:05:14.010956+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (613, 178, 183, '因果', '二・二六事件', '治安維持法が二・二六事件の背景', 1, false, '2025-11-15 17:05:14.011537+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (614, 178, 193, '対立', '日本国憲法', '治安維持法が日本国憲法で廃止', 1, false, '2025-11-15 17:05:14.01207+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (615, 179, 169, '因果', '第一次世界大戦', '第一次世界大戦が世界恐慌の遠因', 1, false, '2025-11-15 17:05:14.012672+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (616, 179, 173, '契機', '経済危機', '世界恐慌がファシズム台頭を招く', 1, false, '2025-11-15 17:05:14.013309+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (617, 179, 180, '因果', '満州事変', '世界恐慌が満州事変を招く', 1, false, '2025-11-15 17:05:14.013906+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (618, 179, 181, '契機', '五・一五事件', '世界恐慌が五・一五事件の背景', 1, false, '2025-11-15 17:05:14.014517+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (619, 179, 183, '契機', '二・二六事件', '世界恐慌が二・二六事件の背景', 1, false, '2025-11-15 17:05:14.01514+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (620, 179, 184, '因果', '日中戦争', '世界恐慌が日中戦争の遠因', 1, false, '2025-11-15 17:05:14.016036+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (621, 179, 207, '同時代', '経済危機', '世界恐慌とリーマンショックの経済危機の類似性', 1, false, '2025-11-15 17:05:14.017424+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (622, 180, 179, '因果', '世界恐慌', '世界恐慌が満州事変を招く', 1, false, '2025-11-15 17:05:14.018845+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (623, 180, 181, '契機', '五・一五事件', '満州事変が五・一五事件を招く', 1, false, '2025-11-15 17:05:14.020171+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (624, 180, 183, '契機', '二・二六事件', '満州事変が二・二六事件を招く', 1, false, '2025-11-15 17:05:14.02179+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (625, 180, 184, '因果', '日中戦争', '満州事変が日中戦争の始まり', 1, false, '2025-11-15 17:05:14.02338+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (626, 180, 185, '因果', '太平洋戦争', '満州事変が太平洋戦争の遠因', 1, false, '2025-11-15 17:05:14.02462+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (627, 181, 180, '因果', '満州事変', '満州事変が五・一五事件を招く', 1, false, '2025-11-15 17:05:14.025309+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (628, 181, 183, '契機', '二・二六事件', '五・一五事件が二・二六事件を誘発', 1, false, '2025-11-15 17:05:14.025981+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (629, 181, 184, '契機', '軍部独走', '五・一五事件が日中戦争を促す', 1, false, '2025-11-15 17:05:14.02682+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (630, 181, 185, '契機', '軍国主義', '五・一五事件が太平洋戦争へ', 1, false, '2025-11-15 17:05:14.027436+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (631, 182, 160, '同時代', '独裁者', 'ナチス・ドイツでヒトラーが独裁', 1, false, '2025-11-15 17:05:14.028047+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (632, 182, 185, '契機', 'ナチスの侵略', 'ナチス・ドイツが第二次世界大戦の主因', 1, false, '2025-11-15 17:05:14.028665+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (633, 183, 180, '因果', '満州事変', '満州事変が二・二六事件の背景', 1, false, '2025-11-15 17:05:14.029282+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (634, 183, 181, '因果', '五・一五事件', '五・一五事件が二・二六事件を誘発', 1, false, '2025-11-15 17:05:14.029913+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (635, 183, 184, '契機', '軍部支配', '二・二六事件が日中戦争を促す', 1, false, '2025-11-15 17:05:14.030473+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (636, 183, 185, '因果', '軍国主義確立', '二・二六事件が太平洋戦争へ', 1, false, '2025-11-15 17:05:14.031058+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (637, 184, 180, '因果', '満州事変', '満州事変が日中戦争の始まり', 1, false, '2025-11-15 17:05:14.031705+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (638, 184, 181, '因果', '五・一五事件', '五・一五事件が日中戦争を促す', 1, false, '2025-11-15 17:05:14.0323+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (639, 184, 183, '因果', '二・二六事件', '二・二六事件が日中戦争を促す', 1, false, '2025-11-15 17:05:14.033333+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (640, 184, 185, '因果', '太平洋戦争', '日中戦争が太平洋戦争へ拡大', 1, false, '2025-11-15 17:05:14.034932+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (641, 184, 186, '契機', '真珠湾攻撃', '日中戦争が真珠湾攻撃を招く', 1, false, '2025-11-15 17:05:14.036186+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (642, 185, 184, '因果', '日中戦争', '日中戦争が太平洋戦争へ拡大', 1, false, '2025-11-15 17:05:14.037277+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (643, 185, 186, '因果', '真珠湾攻撃', '太平洋戦争が真珠湾攻撃で始まる', 1, false, '2025-11-15 17:05:14.038654+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (644, 185, 187, '同時代', 'ヨーロッパ戦線', '第二次世界大戦でノルマンディー上陸', 1, false, '2025-11-15 17:05:14.039687+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (645, 185, 188, '因果', 'ポツダム宣言', '太平洋戦争がポツダム宣言で終結', 1, false, '2025-11-15 17:05:14.040652+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (646, 185, 189, '因果', '終戦', '太平洋戦争が終戦', 1, false, '2025-11-15 17:05:14.041653+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (647, 185, 190, '因果', 'GHQ', '太平洋戦争後にGHQ占領', 1, false, '2025-11-15 17:05:14.042337+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (648, 185, 191, '因果', '戦争終結', '第二次世界大戦の終結に原爆投下', 1, false, '2025-11-15 17:05:14.042966+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (649, 185, 192, '因果', '戦後体制', '第二次世界大戦後に国際連合設立', 1, false, '2025-11-15 17:05:14.043606+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (650, 185, 194, '因果', '戦後対立の始まり', '第二次世界大戦の勝利分配で冷戦開始', 1, false, '2025-11-15 17:05:14.044617+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (651, 186, 185, '因果', '太平洋戦争', '真珠湾攻撃で太平洋戦争開始', 1, false, '2025-11-15 17:05:14.045302+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (652, 186, 188, '契機', 'ポツダム宣言', '真珠湾攻撃がポツダム宣言へ', 1, false, '2025-11-15 17:05:14.046149+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (653, 186, 189, '契機', '終戦', '真珠湾攻撃が終戦の遠因', 1, false, '2025-11-15 17:05:14.046963+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (654, 186, 191, '因果', '日本の敗戦', '真珠湾攻撃後の戦争が原爆投下につながる', 1, false, '2025-11-15 17:05:14.047623+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (655, 187, 185, '契機', '反攻作戦', 'ノルマンディー上陸で連合国が反撃', 1, false, '2025-11-15 17:05:14.048273+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (656, 187, 191, '同時代', '連合国の勝利', 'ノルマンディー上陸と原爆投下で連合国勝利', 1, false, '2025-11-15 17:05:14.049128+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (657, 188, 185, '因果', '太平洋戦争', '太平洋戦争がポツダム宣言で終結', 1, false, '2025-11-15 17:05:14.050456+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (658, 188, 189, '因果', '終戦', 'ポツダム宣言受諾で終戦', 1, false, '2025-11-15 17:05:14.05237+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (659, 188, 190, '因果', 'GHQ', 'ポツダム宣言後にGHQ占領', 1, false, '2025-11-15 17:05:14.053664+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (660, 188, 193, '契機', '日本国憲法', 'ポツダム宣言が日本国憲法を促す', 1, false, '2025-11-15 17:05:14.054394+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (661, 189, 185, '因果', '太平洋戦争', '太平洋戦争が終戦', 1, false, '2025-11-15 17:05:14.055068+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (662, 189, 190, '因果', 'GHQ', '終戦後にGHQ占領', 1, false, '2025-11-15 17:05:14.055705+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (663, 189, 193, '因果', '日本国憲法', '終戦後に日本国憲法制定', 1, false, '2025-11-15 17:05:14.056342+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (664, 189, 195, '契機', 'サンフランシスコ平和条約', '終戦後に独立回復', 1, false, '2025-11-15 17:05:14.056998+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (665, 189, 196, '契機', '高度経済成長', '終戦後に高度経済成長', 1, false, '2025-11-15 17:05:14.057636+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (666, 190, 189, '因果', '終戦', '終戦後にGHQ占領', 1, false, '2025-11-15 17:05:14.058285+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (667, 190, 193, '因果', '日本国憲法', 'GHQが日本国憲法を制定', 1, false, '2025-11-15 17:05:14.058965+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (668, 190, 195, '契機', 'サンフランシスコ平和条約', 'GHQ占領後に独立回復', 1, false, '2025-11-15 17:05:14.059633+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (669, 190, 196, '契機', '高度経済成長', 'GHQの政策が高度経済成長の基盤', 1, false, '2025-11-15 17:05:14.060274+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (670, 191, 185, '因果', '戦争終結', '原爆投下で第二次世界大戦終結', 1, false, '2025-11-15 17:05:14.060935+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (671, 191, 188, '因果', '降伏の決断', '原爆投下がポツダム宣言受諾の決定的要因', 1, false, '2025-11-15 17:05:14.061568+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (672, 191, 189, '因果', '終戦の引き金', '原爆投下が日本の終戦を決定づけた', 1, false, '2025-11-15 17:05:14.062198+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (673, 191, 194, '契機', '核兵器の脅威', '原爆投下後に核の脅威が冷戦を激化', 1, false, '2025-11-15 17:05:14.062806+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (674, 192, 174, '契機', '国際連盟の失敗', '国際連盟の反省から国際連合設立', 1, false, '2025-11-15 17:05:14.06347+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (675, 192, 194, '同時代', '戦後国際秩序', '国際連合設立後すぐに冷戦開始', 1, false, '2025-11-15 17:05:14.064098+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (676, 193, 159, '対立', '大日本帝国憲法', '大日本帝国憲法から日本国憲法へ', 1, false, '2025-11-15 17:05:14.064724+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (677, 193, 189, '因果', '終戦', '終戦後に日本国憲法制定', 1, false, '2025-11-15 17:05:14.065375+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (678, 193, 190, '因果', 'GHQ', 'GHQが日本国憲法を制定', 1, false, '2025-11-15 17:05:14.066177+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (679, 193, 195, '契機', '独立回復', '日本国憲法で独立国家として条約', 1, false, '2025-11-15 17:05:14.067861+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (680, 193, 196, '契機', '高度経済成長', '日本国憲法が高度経済成長の基盤', 1, false, '2025-11-15 17:05:14.069236+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (681, 194, 185, '契機', '戦後対立', '第二次世界大戦後に冷戦開始', 1, false, '2025-11-15 17:05:14.070249+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (682, 194, 190, '契機', '冷戦構造', '冷戦の開始がGHQの占領政策に影響', 1, false, '2025-11-15 17:05:14.070946+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (683, 194, 195, '外交', '西側陣営', '冷戦構造下で日本は西側陣営として講和', 1, false, '2025-11-15 17:05:14.071603+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (684, 194, 197, '因果', '冷戦の代理戦争', '米ソ冷戦がベトナムで代理戦争化', 1, false, '2025-11-15 17:05:14.072309+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (685, 194, 198, '同時代', '東西分断', '冷戦でベルリンの壁が象徴', 1, false, '2025-11-15 17:05:14.073033+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (686, 194, 199, '契機', '核対立の危機', '冷戦が最も緊張したキューバ危機', 1, false, '2025-11-15 17:05:14.073736+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (687, 194, 200, '因果', '冷戦終結後の地域紛争', '冷戦終結が中東の新たな紛争を生む', 1, false, '2025-11-15 17:05:14.074431+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (688, 194, 201, '因果', '冷戦終結', '冷戦の終結とソ連崩壊', 1, false, '2025-11-15 17:05:14.075111+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (689, 195, 189, '因果', '終戦後', '終戦後にサンフランシスコ平和条約', 1, false, '2025-11-15 17:05:14.075776+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (690, 195, 190, '因果', 'GHQ占領終了', 'サンフランシスコ平和条約でGHQ占領終了', 1, false, '2025-11-15 17:05:14.076402+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (691, 195, 196, '因果', '高度経済成長', '独立回復で高度経済成長', 1, false, '2025-11-15 17:05:14.077019+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (692, 196, 149, '同時代', '殖産興業の延長', '殖産興業が高度経済成長の基礎', 1, false, '2025-11-15 17:05:14.077666+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (693, 196, 189, '因果', '終戦後', '終戦後に高度経済成長', 1, false, '2025-11-15 17:05:14.078278+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (694, 196, 195, '因果', '独立回復', 'サンフランシスコ平和条約後に高度経済成長', 1, false, '2025-11-15 17:05:14.0789+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (695, 197, 206, '同時代', 'アメリカの軍事介入', 'ベトナム戦争が米国の対外政策に影響', 1, false, '2025-11-15 17:05:14.079539+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (696, 198, 194, '同時代', '冷戦の象徴', 'ベルリンの壁が冷戦の象徴', 1, false, '2025-11-15 17:05:14.080147+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (697, 198, 201, '因果', '壁の崩壊', 'ベルリンの壁崩壊でソ連崩壊へ', 1, false, '2025-11-15 17:05:14.080811+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (698, 199, 191, '契機', '核兵器の脅威', 'キューバ危機で核戦争の恐怖が現実化', 1, false, '2025-11-15 17:05:14.081445+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (699, 199, 194, '契機', '核戦争の危機', 'キューバ危機が冷戦を緊張させる', 1, false, '2025-11-15 17:05:14.082075+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (700, 200, 206, '因果', '中東情勢の悪化', '湾岸戦争が中東の反米感情を高める', 1, false, '2025-11-15 17:05:14.082964+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (701, 200, 208, '因果', '中東の民主化', '湾岸戦争後の中東情勢がアラブの春を促進', 1, false, '2025-11-15 17:05:14.084865+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (702, 201, 194, '因果', '冷戦終結', 'ソ連崩壊で冷戦終結', 1, false, '2025-11-15 17:05:14.086271+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (703, 201, 198, '契機', '東欧の民主化', 'ソ連崩壊前にベルリンの壁崩壊', 1, false, '2025-11-15 17:05:14.087068+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (704, 201, 202, '因果', '東欧の混乱', 'ソ連崩壊が東欧の民族紛争を引き起こす', 1, false, '2025-11-15 17:05:14.087746+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (705, 202, 203, '因果', 'ヨーロッパ統合の必要性', 'ユーゴ紛争がEU統合を促進', 1, false, '2025-11-15 17:05:14.088413+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (706, 203, 209, '対立', 'EU統合と離脱', 'EU統合の進展が離脱運動を生む', 1, false, '2025-11-15 17:05:14.089397+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (708, 205, 208, '同時代', 'アジアの政治変動', '香港返還とアラブの春の時代背景', 1, false, '2025-11-15 17:05:14.090501+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (709, 206, 208, '因果', '中東の混乱', '9.11後の対テロ戦争が中東を不安定化', 1, false, '2025-11-15 17:05:14.091465+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (710, 207, 209, '因果', '経済不安と政治変動', 'リーマンショックが反EU感情を高める', 1, false, '2025-11-15 17:05:14.092449+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (711, 207, 209, '契機', '経済危機と政治変動', 'リーマンショックの経済不安がBrexit運動を促進', 1, false, '2025-11-15 17:05:14.093086+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (712, 207, 210, '同時代', '現代の危機管理', 'リーマンショックとCOVID-19の危機対応の比較', 1, false, '2025-11-15 17:05:14.093763+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (713, 208, 210, '同時代', '現代の社会変動', 'アラブの春とCOVID-19の社会変動', 1, false, '2025-11-15 17:05:14.09441+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (714, 209, 210, '同時代', '現代の政治変動', 'BrexitとCOVID-19の時代背景', 1, false, '2025-11-15 17:05:14.095046+00');
INSERT INTO public.relations (id, src_id, dst_id, relation_type, keyword, explanation, weight, system_generated, created_at) VALUES (707, 204, 207, '因果', 'グローバル経済の発展', 'IT革命が金融グローバル化を加速', 1, false, '2025-11-15 17:11:47.665436+00');


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

INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (1, '縄文時代', '古代', -14000, '{先史,文化}', '2025-11-15 17:05:13.364412+00', '2025-11-15 17:05:13.364412+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (2, 'ポリス', '古代', -800, '{政治,都市国家}', '2025-11-15 17:05:13.365397+00', '2025-11-15 17:05:13.365397+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (3, 'アテネ民主政', '古代', -508, '{政治,民主主義}', '2025-11-15 17:05:13.36649+00', '2025-11-15 17:05:13.36649+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (4, 'ペルシア戦争', '古代', -490, '{戦争,ギリシャ}', '2025-11-15 17:05:13.367668+00', '2025-11-15 17:05:13.367668+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (5, 'ソクラテス', '古代', -470, '{人物,哲学}', '2025-11-15 17:05:13.368531+00', '2025-11-15 17:05:13.368531+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (6, 'ローマ法', '古代', -450, '{法律,制度}', '2025-11-15 17:05:13.369314+00', '2025-11-15 17:05:13.369314+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (7, 'ペロポネソス戦争', '古代', -431, '{戦争,ギリシャ,内戦}', '2025-11-15 17:05:13.369964+00', '2025-11-15 17:05:13.369964+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (8, 'プラトン', '古代', -427, '{人物,哲学}', '2025-11-15 17:05:13.370572+00', '2025-11-15 17:05:13.370572+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (9, 'アリストテレス', '古代', -384, '{人物,哲学}', '2025-11-15 17:05:13.371157+00', '2025-11-15 17:05:13.371157+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (10, 'アレクサンドロス大王', '古代', -356, '{人物,軍事,帝国}', '2025-11-15 17:05:13.371738+00', '2025-11-15 17:05:13.371738+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (11, '弥生時代', '古代', -300, '{先史,農業}', '2025-11-15 17:05:13.372298+00', '2025-11-15 17:05:13.372298+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (12, 'ポエニ戦争', '古代', -264, '{戦争,ローマ,カルタゴ}', '2025-11-15 17:05:13.372863+00', '2025-11-15 17:05:13.372863+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (13, 'カエサル', '古代', -100, '{人物,軍事,政治}', '2025-11-15 17:05:13.373446+00', '2025-11-15 17:05:13.373446+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (14, 'ローマ帝国', '古代', -27, '{帝国,政治}', '2025-11-15 17:05:13.374014+00', '2025-11-15 17:05:13.374014+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (15, 'キリスト教の成立', '古代', 30, '{宗教,思想}', '2025-11-15 17:05:13.374593+00', '2025-11-15 17:05:13.374593+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (16, 'コンスタンティヌス帝', '古代', 272, '{人物,宗教,政治}', '2025-11-15 17:05:13.37523+00', '2025-11-15 17:05:13.37523+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (17, '大和政権', '古代', 300, '{政治,統一}', '2025-11-15 17:05:13.375794+00', '2025-11-15 17:05:13.375794+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (18, '古墳', '古代', 300, '{文化,権力}', '2025-11-15 17:05:13.376411+00', '2025-11-15 17:05:13.376411+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (19, 'ゲルマン人の大移動', '古代', 375, '{民族移動,混乱}', '2025-11-15 17:05:13.377781+00', '2025-11-15 17:05:13.377781+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (20, 'ビザンツ帝国', '中世', 395, '{帝国,東方}', '2025-11-15 17:05:13.378649+00', '2025-11-15 17:05:13.378649+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (21, 'フランク王国', '中世', 481, '{王国,政治}', '2025-11-15 17:05:13.379293+00', '2025-11-15 17:05:13.379293+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (22, '聖徳太子', '古代', 574, '{政治,仏教}', '2025-11-15 17:05:13.37991+00', '2025-11-15 17:05:13.37991+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (23, '遣隋使', '古代', 600, '{外交,文化}', '2025-11-15 17:05:13.380591+00', '2025-11-15 17:05:13.380591+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (24, '冠位十二階', '古代', 603, '{政治改革,制度}', '2025-11-15 17:05:13.381196+00', '2025-11-15 17:05:13.381196+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (25, '憲法十七条', '古代', 604, '{政治改革,法律}', '2025-11-15 17:05:13.381845+00', '2025-11-15 17:05:13.381845+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (26, 'イスラム帝国の拡大', '中世', 632, '{帝国,宗教,軍事}', '2025-11-15 17:05:13.38259+00', '2025-11-15 17:05:13.38259+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (27, '大化の改新', '古代', 645, '{政治改革,変革}', '2025-11-15 17:05:13.383999+00', '2025-11-15 17:05:13.383999+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (28, '白村江の戦い', '古代', 663, '{戦争,外交}', '2025-11-15 17:05:13.38525+00', '2025-11-15 17:05:13.38525+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (29, '壬申の乱', '古代', 672, '{内乱,権力闘争}', '2025-11-15 17:05:13.38609+00', '2025-11-15 17:05:13.38609+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (30, '大宝律令', '古代', 701, '{法律,制度}', '2025-11-15 17:05:13.38673+00', '2025-11-15 17:05:13.38673+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (31, '平城京', '古代', 710, '{遷都,都市}', '2025-11-15 17:05:13.387624+00', '2025-11-15 17:05:13.387624+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (32, '奈良時代', '古代', 710, '{時代,仏教}', '2025-11-15 17:05:13.388508+00', '2025-11-15 17:05:13.388508+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (33, 'レコンキスタ', '中世', 718, '{戦争,スペイン,宗教}', '2025-11-15 17:05:13.389413+00', '2025-11-15 17:05:13.389413+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (34, 'カール大帝', '中世', 742, '{人物,王,政治}', '2025-11-15 17:05:13.39031+00', '2025-11-15 17:05:13.39031+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (35, '平安京', '古代', 794, '{遷都,都市}', '2025-11-15 17:05:13.390905+00', '2025-11-15 17:05:13.390905+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (36, '封建制度', '中世', 800, '{制度,社会}', '2025-11-15 17:05:13.39147+00', '2025-11-15 17:05:13.39147+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (37, '荘園制', '中世', 800, '{経済,制度}', '2025-11-15 17:05:13.392295+00', '2025-11-15 17:05:13.392295+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (38, '摂関政治', '中世', 858, '{政治,藤原氏}', '2025-11-15 17:05:13.39307+00', '2025-11-15 17:05:13.39307+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (39, '教皇権の拡大', '中世', 1000, '{宗教,政治}', '2025-11-15 17:05:13.393936+00', '2025-11-15 17:05:13.393936+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (40, '東西教会の分裂', '中世', 1054, '{宗教,分裂}', '2025-11-15 17:05:13.394505+00', '2025-11-15 17:05:13.394505+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (41, 'ノルマン征服', '中世', 1066, '{戦争,イギリス}', '2025-11-15 17:05:13.395079+00', '2025-11-15 17:05:13.395079+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (42, 'カノッサの屈辱', '中世', 1077, '{事件,宗教,政治}', '2025-11-15 17:05:13.39562+00', '2025-11-15 17:05:13.39562+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (43, '院政', '中世', 1086, '{政治,変革}', '2025-11-15 17:05:13.396171+00', '2025-11-15 17:05:13.396171+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (44, '十字軍', '中世', 1096, '{戦争,宗教}', '2025-11-15 17:05:13.396735+00', '2025-11-15 17:05:13.396735+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (45, 'スコラ哲学', '中世', 1100, '{哲学,宗教}', '2025-11-15 17:05:13.397361+00', '2025-11-15 17:05:13.397361+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (46, '平清盛', '中世', 1118, '{人物,武士}', '2025-11-15 17:05:13.397926+00', '2025-11-15 17:05:13.397926+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (47, '源頼朝', '中世', 1147, '{人物,武士}', '2025-11-15 17:05:13.398493+00', '2025-11-15 17:05:13.398493+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (48, '鎌倉幕府', '中世', 1185, '{政治,武家政権}', '2025-11-15 17:05:13.399118+00', '2025-11-15 17:05:13.399118+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (49, '執権政治', '中世', 1203, '{政治,北条氏}', '2025-11-15 17:05:13.400162+00', '2025-11-15 17:05:13.400162+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (50, 'モンゴル帝国の拡大', '中世', 1206, '{帝国,軍事,東方}', '2025-11-15 17:05:13.401616+00', '2025-11-15 17:05:13.401616+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (51, 'マグナ・カルタ', '中世', 1215, '{法律,人権,政治}', '2025-11-15 17:05:13.402523+00', '2025-11-15 17:05:13.402523+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (52, 'マグナカルタ', '中世', 1215, '{法律,民主主義,イギリス}', '2025-11-15 17:05:13.40324+00', '2025-11-15 17:05:13.40324+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (53, '承久の乱', '中世', 1221, '{戦争,幕府vs朝廷}', '2025-11-15 17:05:13.403806+00', '2025-11-15 17:05:13.403806+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (54, 'トマス・アクィナス', '中世', 1225, '{人物,哲学,神学}', '2025-11-15 17:05:13.404387+00', '2025-11-15 17:05:13.404387+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (55, '御成敗式目', '中世', 1232, '{法律,武家法}', '2025-11-15 17:05:13.404928+00', '2025-11-15 17:05:13.404928+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (56, '元寇', '中世', 1274, '{戦争,外敵}', '2025-11-15 17:05:13.405508+00', '2025-11-15 17:05:13.405508+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (57, '後醍醐天皇', '中世', 1288, '{人物,政治}', '2025-11-15 17:05:13.406087+00', '2025-11-15 17:05:13.406087+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (58, 'ルネサンス', '近世', 1300, '{文化,芸術}', '2025-11-15 17:05:13.406667+00', '2025-11-15 17:05:13.406667+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (59, '足利尊氏', '中世', 1305, '{人物,武士}', '2025-11-15 17:05:13.407291+00', '2025-11-15 17:05:13.407291+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (60, '建武の新政', '中世', 1333, '{政治改革,短命}', '2025-11-15 17:05:13.408039+00', '2025-11-15 17:05:13.408039+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (61, '南北朝時代', '中世', 1336, '{内乱,分裂}', '2025-11-15 17:05:13.40865+00', '2025-11-15 17:05:13.40865+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (62, '室町幕府', '中世', 1336, '{政治,武家政権}', '2025-11-15 17:05:13.409241+00', '2025-11-15 17:05:13.409241+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (63, '百年戦争', '中世', 1337, '{戦争,イギリス,フランス}', '2025-11-15 17:05:13.409804+00', '2025-11-15 17:05:13.409804+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (64, '黒死病（ペスト）', '中世', 1347, '{疫病,社会}', '2025-11-15 17:05:13.410484+00', '2025-11-15 17:05:13.410484+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (65, '足利義満', '中世', 1358, '{人物,文化}', '2025-11-15 17:05:13.411055+00', '2025-11-15 17:05:13.411055+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (66, '教会分裂', '中世', 1378, '{宗教,分裂}', '2025-11-15 17:05:13.411611+00', '2025-11-15 17:05:13.411611+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (67, 'ジャンヌ・ダルク', '中世', 1412, '{人物,戦争,宗教}', '2025-11-15 17:05:13.412159+00', '2025-11-15 17:05:13.412159+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (68, '大航海時代', '近世', 1415, '{探検,経済,植民地}', '2025-11-15 17:05:13.412746+00', '2025-11-15 17:05:13.412746+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (69, 'コロンブス', '近世', 1451, '{人物,探検家}', '2025-11-15 17:05:13.413353+00', '2025-11-15 17:05:13.413353+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (70, 'レオナルド・ダ・ヴィンチ', '近世', 1452, '{人物,芸術,科学}', '2025-11-15 17:05:13.413932+00', '2025-11-15 17:05:13.413932+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (71, 'ヴァスコ・ダ・ガマ', '近世', 1460, '{人物,探検家}', '2025-11-15 17:05:13.414495+00', '2025-11-15 17:05:13.414495+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (72, '応仁の乱', '中世', 1467, '{戦争,混乱}', '2025-11-15 17:05:13.415128+00', '2025-11-15 17:05:13.415128+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (73, '戦国時代', '中世', 1467, '{時代,戦乱}', '2025-11-15 17:05:13.415855+00', '2025-11-15 17:05:13.415855+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (74, 'ミケランジェロ', '近世', 1475, '{人物,芸術}', '2025-11-15 17:05:13.417115+00', '2025-11-15 17:05:13.417115+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (75, 'マゼラン', '近世', 1480, '{人物,探検家}', '2025-11-15 17:05:13.418556+00', '2025-11-15 17:05:13.418556+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (76, 'マルティン・ルター', '近世', 1483, '{人物,宗教,改革}', '2025-11-15 17:05:13.419514+00', '2025-11-15 17:05:13.419514+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (77, '絶対王政', '近世', 1500, '{政治,制度}', '2025-11-15 17:05:13.420143+00', '2025-11-15 17:05:13.420143+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (78, '重商主義', '近世', 1500, '{経済,政策}', '2025-11-15 17:05:13.420727+00', '2025-11-15 17:05:13.420727+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (79, 'カルヴァン', '近世', 1509, '{人物,宗教,改革}', '2025-11-15 17:05:13.421346+00', '2025-11-15 17:05:13.421346+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (80, '宗教改革', '近世', 1517, '{宗教,改革}', '2025-11-15 17:05:13.421926+00', '2025-11-15 17:05:13.421926+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (81, '織田信長', '中世', 1534, '{人物,統一}', '2025-11-15 17:05:13.422503+00', '2025-11-15 17:05:13.422503+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (82, 'イエズス会', '近世', 1534, '{宗教,布教,日本関連}', '2025-11-15 17:05:13.423268+00', '2025-11-15 17:05:13.423268+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (83, '豊臣秀吉', '中世', 1537, '{人物,統一}', '2025-11-15 17:05:13.423891+00', '2025-11-15 17:05:13.423891+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (84, '徳川家康', '中世', 1543, '{人物,統一}', '2025-11-15 17:05:13.424521+00', '2025-11-15 17:05:13.424521+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (85, '科学革命', '近世', 1543, '{科学,革新}', '2025-11-15 17:05:13.425126+00', '2025-11-15 17:05:13.425126+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (86, '対抗宗教改革', '近世', 1545, '{宗教,カトリック}', '2025-11-15 17:05:13.425721+00', '2025-11-15 17:05:13.425721+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (87, 'ガリレオ・ガリレイ', '近世', 1564, '{人物,科学}', '2025-11-15 17:05:13.426352+00', '2025-11-15 17:05:13.426352+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (88, '関ヶ原の戦い', '近世', 1600, '{戦争,転換点}', '2025-11-15 17:05:13.426931+00', '2025-11-15 17:05:13.426931+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (89, '江戸幕府', '近世', 1603, '{政治,武家政権}', '2025-11-15 17:05:13.427488+00', '2025-11-15 17:05:13.427488+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (90, '幕藩体制', '近世', 1603, '{政治,制度}', '2025-11-15 17:05:13.428054+00', '2025-11-15 17:05:13.428054+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (91, '三十年戦争', '近世', 1618, '{戦争,宗教,ドイツ}', '2025-11-15 17:05:13.42859+00', '2025-11-15 17:05:13.42859+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (92, '参勤交代', '近世', 1635, '{政治,統制}', '2025-11-15 17:05:13.429132+00', '2025-11-15 17:05:13.429132+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (93, '島原の乱', '近世', 1637, '{一揆,宗教}', '2025-11-15 17:05:13.42972+00', '2025-11-15 17:05:13.42972+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (94, 'ルイ14世', '近世', 1638, '{人物,王,絶対王政}', '2025-11-15 17:05:13.430273+00', '2025-11-15 17:05:13.430273+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (95, '太陽王', '近世', 1638, '{人物,王,フランス}', '2025-11-15 17:05:13.43114+00', '2025-11-15 17:05:13.43114+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (96, '鎖国', '近世', 1639, '{外交,政策}', '2025-11-15 17:05:13.432014+00', '2025-11-15 17:05:13.432014+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (97, 'ニュートン', '近世', 1643, '{人物,科学}', '2025-11-15 17:05:13.433454+00', '2025-11-15 17:05:13.433454+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (98, '徳川綱吉', '近世', 1646, '{人物,政治}', '2025-11-15 17:05:13.435587+00', '2025-11-15 17:05:13.435587+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (99, 'ウェストファリア条約', '近世', 1648, '{条約,平和,主権}', '2025-11-15 17:05:13.436314+00', '2025-11-15 17:05:13.436314+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (100, '啓蒙思想', '近世', 1650, '{思想,哲学}', '2025-11-15 17:05:13.436991+00', '2025-11-15 17:05:13.436991+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (101, '徳川吉宗', '近世', 1684, '{人物,改革者}', '2025-11-15 17:05:13.437608+00', '2025-11-15 17:05:13.437608+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (102, '生類憐みの令', '近世', 1685, '{政策,法律}', '2025-11-15 17:05:13.438378+00', '2025-11-15 17:05:13.438378+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (103, 'モンテスキュー', '近世', 1689, '{人物,思想家,三権分立}', '2025-11-15 17:05:13.438988+00', '2025-11-15 17:05:13.438988+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (104, 'ヴォルテール', '近世', 1694, '{人物,思想家}', '2025-11-15 17:05:13.439593+00', '2025-11-15 17:05:13.439593+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (105, 'ルソー', '近世', 1712, '{人物,思想家}', '2025-11-15 17:05:13.440151+00', '2025-11-15 17:05:13.440151+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (106, '享保の改革', '近世', 1716, '{政治改革,財政}', '2025-11-15 17:05:13.440704+00', '2025-11-15 17:05:13.440704+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (107, '田沼意次', '近世', 1719, '{人物,経済}', '2025-11-15 17:05:13.441294+00', '2025-11-15 17:05:13.441294+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (108, '松平定信', '近世', 1758, '{人物,改革者}', '2025-11-15 17:05:13.441947+00', '2025-11-15 17:05:13.441947+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (109, '産業革命', '近代', 1760, '{経済,技術革新}', '2025-11-15 17:05:13.442485+00', '2025-11-15 17:05:13.442485+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (110, 'ナポレオン', '近代', 1769, '{人物,軍事,帝国}', '2025-11-15 17:05:13.443035+00', '2025-11-15 17:05:13.443035+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (111, '蒸気機関', '近代', 1769, '{技術,産業}', '2025-11-15 17:05:13.443587+00', '2025-11-15 17:05:13.443587+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (112, 'アメリカ独立革命', '近代', 1775, '{革命,独立}', '2025-11-15 17:05:13.444135+00', '2025-11-15 17:05:13.444135+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (113, '寛政の改革', '近世', 1787, '{政治改革,財政}', '2025-11-15 17:05:13.444676+00', '2025-11-15 17:05:13.444676+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (114, 'フランス革命', '近代', 1789, '{革命,市民革命}', '2025-11-15 17:05:13.445223+00', '2025-11-15 17:05:13.445223+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (115, '水野忠邦', '近世', 1794, '{人物,改革者}', '2025-11-15 17:05:13.445768+00', '2025-11-15 17:05:13.445768+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (116, '資本主義の発展', '近代', 1800, '{経済,社会}', '2025-11-15 17:05:13.446302+00', '2025-11-15 17:05:13.446302+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (117, 'ナポレオン戦争', '近代', 1803, '{戦争,ヨーロッパ}', '2025-11-15 17:05:13.446832+00', '2025-11-15 17:05:13.446832+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (118, '化政文化', '近世', 1804, '{文化,庶民}', '2025-11-15 17:05:13.447385+00', '2025-11-15 17:05:13.447385+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (119, 'リンカーン', '近代', 1809, '{人物,大統領,奴隷解放}', '2025-11-15 17:05:13.447941+00', '2025-11-15 17:05:13.447941+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (120, 'ウィーン会議', '近代', 1814, '{会議,平和,保守反動}', '2025-11-15 17:05:13.44848+00', '2025-11-15 17:05:13.44848+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (121, '井伊直弼', '近代', 1815, '{人物,幕末}', '2025-11-15 17:05:13.449557+00', '2025-11-15 17:05:13.449557+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (122, 'ビスマルク', '近代', 1815, '{人物,政治家,統一}', '2025-11-15 17:05:13.450655+00', '2025-11-15 17:05:13.450655+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (123, 'マルクス', '近代', 1818, '{人物,思想家,社会主義}', '2025-11-15 17:05:13.451902+00', '2025-11-15 17:05:13.451902+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (124, '天保の改革', '近世', 1830, '{政治改革,財政}', '2025-11-15 17:05:13.452547+00', '2025-11-15 17:05:13.452547+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (125, '坂本龍馬', '近代', 1836, '{人物,仲介}', '2025-11-15 17:05:13.453165+00', '2025-11-15 17:05:13.453165+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (126, 'アヘン戦争', '近代', 1840, '{戦争,中国,植民地,日本関連}', '2025-11-15 17:05:13.453882+00', '2025-11-15 17:05:13.453882+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (127, '伊藤博文', '近代', 1841, '{人物,政治家}', '2025-11-15 17:05:13.454571+00', '2025-11-15 17:05:13.454571+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (128, '共産党宣言', '近代', 1848, '{思想,社会主義}', '2025-11-15 17:05:13.455158+00', '2025-11-15 17:05:13.455158+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (129, '二月革命（1848年）', '近代', 1848, '{革命,フランス}', '2025-11-15 17:05:13.455735+00', '2025-11-15 17:05:13.455735+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (130, 'ウィーン体制の崩壊', '近代', 1848, '{政治,変革}', '2025-11-15 17:05:13.456274+00', '2025-11-15 17:05:13.456274+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (131, '尊王攘夷', '近代', 1850, '{思想,運動}', '2025-11-15 17:05:13.45696+00', '2025-11-15 17:05:13.45696+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (132, '太平天国の乱', '近代', 1851, '{反乱,中国,宗教}', '2025-11-15 17:05:13.457533+00', '2025-11-15 17:05:13.457533+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (133, 'ペリー来航', '近世', 1853, '{外交,開国}', '2025-11-15 17:05:13.458072+00', '2025-11-15 17:05:13.458072+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (134, '黒船', '近世', 1853, '{外交,技術}', '2025-11-15 17:05:13.458634+00', '2025-11-15 17:05:13.458634+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (135, 'クリミア戦争', '近代', 1853, '{戦争,ロシア}', '2025-11-15 17:05:13.459215+00', '2025-11-15 17:05:13.459215+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (136, '日米和親条約', '近世', 1854, '{条約,開国}', '2025-11-15 17:05:13.459774+00', '2025-11-15 17:05:13.459774+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (137, '原敬', '現代', 1856, '{人物,政治家}', '2025-11-15 17:05:13.46035+00', '2025-11-15 17:05:13.46035+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (138, '日米修好通商条約', '近世', 1858, '{条約,不平等}', '2025-11-15 17:05:13.460898+00', '2025-11-15 17:05:13.460898+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (139, '安政の大獄', '近代', 1858, '{弾圧,政治}', '2025-11-15 17:05:13.461439+00', '2025-11-15 17:05:13.461439+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (140, '桜田門外の変', '近代', 1860, '{事件,テロ}', '2025-11-15 17:05:13.461977+00', '2025-11-15 17:05:13.461977+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (141, 'イタリア統一', '近代', 1861, '{統一,民族主義}', '2025-11-15 17:05:13.462561+00', '2025-11-15 17:05:13.462561+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (142, '南北戦争', '近代', 1861, '{戦争,アメリカ,奴隷制}', '2025-11-15 17:05:13.46315+00', '2025-11-15 17:05:13.46315+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (143, '薩長同盟', '近代', 1866, '{同盟,倒幕}', '2025-11-15 17:05:13.463736+00', '2025-11-15 17:05:13.463736+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (144, '大政奉還', '近代', 1867, '{政治,転換}', '2025-11-15 17:05:13.464307+00', '2025-11-15 17:05:13.464307+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (145, '王政復古の大号令', '近代', 1868, '{政治,転換}', '2025-11-15 17:05:13.464865+00', '2025-11-15 17:05:13.464865+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (146, '戊辰戦争', '近代', 1868, '{戦争,内戦}', '2025-11-15 17:05:13.465432+00', '2025-11-15 17:05:13.465432+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (147, '明治維新', '近代', 1868, '{政治改革,近代化}', '2025-11-15 17:05:13.466243+00', '2025-11-15 17:05:13.466243+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (148, '富国強兵', '近代', 1868, '{政策,スローガン}', '2025-11-15 17:05:13.467548+00', '2025-11-15 17:05:13.467548+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (149, '殖産興業', '近代', 1868, '{政策,経済}', '2025-11-15 17:05:13.468717+00', '2025-11-15 17:05:13.468717+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (150, '版籍奉還', '近代', 1869, '{政治改革,中央集権}', '2025-11-15 17:05:13.47007+00', '2025-11-15 17:05:13.47007+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (151, '帝国主義', '近代', 1870, '{政策,植民地}', '2025-11-15 17:05:13.471231+00', '2025-11-15 17:05:13.471231+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (152, '廃藩置県', '近代', 1871, '{政治改革,中央集権}', '2025-11-15 17:05:13.472441+00', '2025-11-15 17:05:13.472441+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (153, 'ドイツ統一', '近代', 1871, '{統一,民族主義}', '2025-11-15 17:05:13.47313+00', '2025-11-15 17:05:13.47313+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (154, '学制', '近代', 1872, '{教育,制度}', '2025-11-15 17:05:13.473787+00', '2025-11-15 17:05:13.473787+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (155, '徴兵令', '近代', 1873, '{軍事,制度}', '2025-11-15 17:05:13.47442+00', '2025-11-15 17:05:13.47442+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (156, '地租改正', '近代', 1873, '{税制,改革}', '2025-11-15 17:05:13.475019+00', '2025-11-15 17:05:13.475019+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (157, '自由民権運動', '近代', 1874, '{運動,民主化}', '2025-11-15 17:05:13.475603+00', '2025-11-15 17:05:13.475603+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (158, 'アフリカ分割', '近代', 1884, '{植民地,帝国主義}', '2025-11-15 17:05:13.476523+00', '2025-11-15 17:05:13.476523+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (159, '大日本帝国憲法', '近代', 1889, '{法律,憲法}', '2025-11-15 17:05:13.477451+00', '2025-11-15 17:05:13.477451+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (160, 'ヒトラー', '現代', 1889, '{人物,独裁者}', '2025-11-15 17:05:13.478371+00', '2025-11-15 17:05:13.478371+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (161, '帝国議会', '近代', 1890, '{政治,議会}', '2025-11-15 17:05:13.479358+00', '2025-11-15 17:05:13.479358+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (162, '日清戦争', '近代', 1894, '{戦争,対外}', '2025-11-15 17:05:13.47994+00', '2025-11-15 17:05:13.47994+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (163, '下関条約', '近代', 1895, '{条約,勝利}', '2025-11-15 17:05:13.480553+00', '2025-11-15 17:05:13.480553+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (164, '日露戦争', '近代', 1904, '{戦争,対外}', '2025-11-15 17:05:13.48114+00', '2025-11-15 17:05:13.48114+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (165, 'ポーツマス条約', '近代', 1905, '{条約,勝利}', '2025-11-15 17:05:13.481737+00', '2025-11-15 17:05:13.481737+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (166, '韓国併合', '現代', 1910, '{外交,植民地}', '2025-11-15 17:05:13.482502+00', '2025-11-15 17:05:13.482502+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (167, '辛亥革命', '現代', 1911, '{革命,中国,共和制}', '2025-11-15 17:05:13.483701+00', '2025-11-15 17:05:13.483701+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (168, '大正デモクラシー', '現代', 1912, '{政治,民主化}', '2025-11-15 17:05:13.485217+00', '2025-11-15 17:05:13.485217+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (169, '第一次世界大戦', '現代', 1914, '{戦争,国際}', '2025-11-15 17:05:13.486191+00', '2025-11-15 17:05:13.486191+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (170, 'サラエボ事件', '近代', 1914, '{事件,戦争の引き金}', '2025-11-15 17:05:13.486991+00', '2025-11-15 17:05:13.486991+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (171, 'ロシア革命', '近代', 1917, '{革命,社会主義}', '2025-11-15 17:05:13.487766+00', '2025-11-15 17:05:13.487766+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (172, 'ヴェルサイユ条約', '現代', 1919, '{条約,戦後処理}', '2025-11-15 17:05:13.488385+00', '2025-11-15 17:05:13.488385+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (173, 'ファシズムの台頭', '現代', 1919, '{政治,独裁}', '2025-11-15 17:05:13.489001+00', '2025-11-15 17:05:13.489001+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (174, '国際連盟', '現代', 1920, '{国際機関,平和}', '2025-11-15 17:05:13.48959+00', '2025-11-15 17:05:13.48959+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (175, 'ワシントン会議', '現代', 1921, '{外交,軍縮,国際}', '2025-11-15 17:05:13.490212+00', '2025-11-15 17:05:13.490212+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (176, '関東大震災', '現代', 1923, '{災害,社会}', '2025-11-15 17:05:13.49077+00', '2025-11-15 17:05:13.49077+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (177, '普通選挙法', '現代', 1925, '{法律,民主化}', '2025-11-15 17:05:13.491303+00', '2025-11-15 17:05:13.491303+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (178, '治安維持法', '現代', 1925, '{法律,弾圧}', '2025-11-15 17:05:13.491848+00', '2025-11-15 17:05:13.491848+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (179, '世界恐慌', '現代', 1929, '{経済,国際}', '2025-11-15 17:05:13.492388+00', '2025-11-15 17:05:13.492388+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (180, '満州事変', '現代', 1931, '{戦争,侵略}', '2025-11-15 17:05:13.492937+00', '2025-11-15 17:05:13.492937+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (181, '五・一五事件', '現代', 1932, '{事件,テロ}', '2025-11-15 17:05:13.493466+00', '2025-11-15 17:05:13.493466+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (182, 'ナチス・ドイツ', '現代', 1933, '{政治,独裁}', '2025-11-15 17:05:13.494018+00', '2025-11-15 17:05:13.494018+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (183, '二・二六事件', '現代', 1936, '{事件,クーデタ}', '2025-11-15 17:05:13.494552+00', '2025-11-15 17:05:13.494552+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (184, '日中戦争', '現代', 1937, '{戦争,侵略}', '2025-11-15 17:05:13.49508+00', '2025-11-15 17:05:13.49508+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (185, '第二次世界大戦', '現代', 1941, '{戦争,敗戦}', '2025-11-15 17:05:13.495612+00', '2025-11-15 17:05:13.495612+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (186, '真珠湾攻撃', '現代', 1941, '{戦争,開戦}', '2025-11-15 17:05:13.496151+00', '2025-11-15 17:05:13.496151+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (187, 'ノルマンディー上陸作戦', '現代', 1944, '{戦争,連合国}', '2025-11-15 17:05:13.49674+00', '2025-11-15 17:05:13.49674+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (188, 'ポツダム宣言', '現代', 1945, '{終戦,降伏}', '2025-11-15 17:05:13.497312+00', '2025-11-15 17:05:13.497312+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (189, '終戦', '現代', 1945, '{終戦,転換}', '2025-11-15 17:05:13.497874+00', '2025-11-15 17:05:13.497874+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (190, 'GHQ', '現代', 1945, '{占領,アメリカ}', '2025-11-15 17:05:13.498395+00', '2025-11-15 17:05:13.498395+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (191, '原爆投下', '現代', 1945, '{戦争,核兵器,日本関連}', '2025-11-15 17:05:13.499036+00', '2025-11-15 17:05:13.499036+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (192, '国際連合', '現代', 1945, '{国際機関,平和}', '2025-11-15 17:05:13.500332+00', '2025-11-15 17:05:13.500332+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (193, '日本国憲法', '現代', 1947, '{法律,憲法}', '2025-11-15 17:05:13.501972+00', '2025-11-15 17:05:13.501972+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (194, '冷戦', '現代', 1947, '{対立,米ソ,日本関連}', '2025-11-15 17:05:13.503032+00', '2025-11-15 17:05:13.503032+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (195, 'サンフランシスコ平和条約', '現代', 1951, '{条約,独立}', '2025-11-15 17:05:13.503896+00', '2025-11-15 17:05:13.503896+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (196, '高度経済成長', '現代', 1955, '{経済,発展}', '2025-11-15 17:05:13.504627+00', '2025-11-15 17:05:13.504627+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (197, 'ベトナム戦争', '現代', 1955, '{戦争,冷戦,アジア}', '2025-11-15 17:05:13.505249+00', '2025-11-15 17:05:13.505249+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (198, 'ベルリンの壁', '現代', 1961, '{分断,冷戦}', '2025-11-15 17:05:13.505851+00', '2025-11-15 17:05:13.505851+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (199, 'キューバ危機', '現代', 1962, '{危機,核戦争}', '2025-11-15 17:05:13.506454+00', '2025-11-15 17:05:13.506454+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (200, '湾岸戦争', '現代', 1990, '{戦争,中東,国際}', '2025-11-15 17:05:13.507092+00', '2025-11-15 17:05:13.507092+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (201, 'ソ連崩壊', '現代', 1991, '{崩壊,冷戦終結}', '2025-11-15 17:05:13.507673+00', '2025-11-15 17:05:13.507673+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (202, 'ユーゴスラビア紛争', '現代', 1991, '{戦争,民族,ヨーロッパ}', '2025-11-15 17:05:13.508246+00', '2025-11-15 17:05:13.508246+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (203, 'EU発足', '現代', 1993, '{外交,統合,ヨーロッパ}', '2025-11-15 17:05:13.508792+00', '2025-11-15 17:05:13.508792+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (204, 'IT革命', '現代', 1995, '{技術,経済,社会}', '2025-11-15 17:05:13.509354+00', '2025-11-15 17:05:13.509354+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (205, '香港返還', '現代', 1997, '{外交,中国,アジア}', '2025-11-15 17:05:13.509902+00', '2025-11-15 17:05:13.509902+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (206, '9.11同時多発テロ', '現代', 2001, '{テロ,アメリカ,戦争}', '2025-11-15 17:05:13.510448+00', '2025-11-15 17:05:13.510448+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (207, 'リーマンショック', '現代', 2008, '{経済,金融危機,アメリカ}', '2025-11-15 17:05:13.510975+00', '2025-11-15 17:05:13.510975+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (208, 'アラブの春', '現代', 2010, '{革命,民主化,中東}', '2025-11-15 17:05:13.511501+00', '2025-11-15 17:05:13.511501+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (209, 'Brexit', '現代', 2016, '{外交,離脱,ヨーロッパ}', '2025-11-15 17:05:13.512018+00', '2025-11-15 17:05:13.512018+00');
INSERT INTO public.terms (id, name, era, year, tags, created_at, updated_at) VALUES (210, 'COVID-19', '現代', 2019, '{パンデミック,医療,国際}', '2025-11-15 17:05:13.512547+00', '2025-11-15 17:05:13.512547+00');


--
-- Name: relations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.relations_id_seq', 714, true);


--
-- Name: routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.routes_id_seq', 1, false);


--
-- Name: terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.terms_id_seq', 210, true);


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
-- Name: relations relations_src_id_dst_id_relation_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_src_id_dst_id_relation_type_key UNIQUE (src_id, dst_id, relation_type);


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
-- Name: terms terms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_name_key UNIQUE (name);


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
-- Name: idx_relations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relations_type ON public.relations USING btree (relation_type);


--
-- Name: games games_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_games_updated_at();


--
-- Name: terms trigger_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_terms_updated_at BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


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
-- Name: route_distractors route_distractors_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_distractors
    ADD CONSTRAINT route_distractors_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);


--
-- Name: route_steps route_steps_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_steps
    ADD CONSTRAINT route_steps_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: route_steps route_steps_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_steps
    ADD CONSTRAINT route_steps_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);


--
-- Name: routes routes_start_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_start_term_id_fkey FOREIGN KEY (start_term_id) REFERENCES public.terms(id);


--
-- PostgreSQL database dump complete
--

\unrestrict QFXaibciNbBIaB7u17WDSIvaOHDi9EInsFsfOeaIo0QW7TEraX4Q6Ui9fpN7sDc

