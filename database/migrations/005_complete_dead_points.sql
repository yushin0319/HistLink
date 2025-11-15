-- Complete dead points resolution: Add final 2 relations for リンカーン and サラエボ事件

INSERT INTO relations (src_id, dst_id, relation_type, keyword, explanation) VALUES
-- リンカーン（181）に追加: 南北戦争からの接続
(180, 181, '文化', '戦時大統領', '南北戦争でリンカーンがアメリカを統率'),

-- サラエボ事件（184）に追加: 帝国主義からの接続
(176, 184, '契機', '帝国主義対立の爆発', '帝国主義列強の対立がサラエボ事件を引き起こす')

ON CONFLICT (src_id, dst_id, relation_type) DO NOTHING;
