-- SWE-Bench Dashboard: Seed Data
-- Popula com ~50+ avaliações realistas de modelos em SWE-Bench

INSERT INTO swe_bench_evaluations (model_name, benchmark_type, resolved_rate, avg_time_seconds, total_tasks, pass_k, date_added, metadata) VALUES
-- GPT-4o family
('GPT-4o (2024-05-13)', 'verified', 33.2, 45.3, 2294, 1, '2024-05-13', '{"provider":"OpenAI","model_family":"gpt4","regions":["us","eu"],"parameters_b":175}'),
('GPT-4o (2024-08-06)', 'verified', 33.2, 39.8, 2294, 1, '2024-08-06', '{"provider":"openai","model_family":"gpt4","regions":["us","eu"],"parameters_b":175}'),
('GPT-4o (2024-11-20)', 'verified', 38.0, 45.1, 2294, 1, '2024-11-20', '{"provider":"openai","model_family":"gpt4","regions":["us","eu"],"parameters_b":175}'),
('GPT-4o-mini', 'verified', 22.0, 95.2, 2294, 1, '2024-07-18', '{"provider":"openai","model_family":"gpt4-mini","regions":["us","eu"],"parameters_b":8}'),

-- Claude family
('Claude 3.5 Sonnet', 'verified', 49.0, 82.5, 2294, 1, '2024-06-20', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('Claude 3.5 Haiku', 'verified', 41.0, 65.2, 2294, 1, '2024-10-22', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('Claude 3 Opus', 'verified', 27.0, 95.1, 2294, 1, '2024-03-04', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('Claude 3.7 Sonnet', 'verified', 52.3, 78.4, 2294, 1, '2025-02-24', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),

-- Gemini family
('Gemini 2.0 Flash', 'verified', 30.0, 61.3, 2294, 1, '2024-12-11', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),
('Gemini 2.5 Pro', 'verified', 44.0, 112.7, 2294, 1, '2025-03-25', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),
('Gemini 1.5 Pro', 'verified', 21.0, 88.5, 2294, 1, '2024-05-14', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),

-- Grok family
('Grok 3', 'verified', 38.0, 96.2, 2294, 1, '2025-02-18', '{"provider":"xai","model_family":"grok","regions":["us"],"parameters_b":null}'),
('Grok 2', 'verified', 20.0, 70.1, 2294, 1, '2024-08-13', '{"provider":"xai","model_family":"grok","regions":["us"],"parameters_b":null}'),

-- DeepSeek family
('DeepSeek V3', 'verified', 21.0, 54.8, 2294, 1, '2024-12-26', '{"provider":"deepseek","model_family":"deepseek","regions":["cn"],"parameters_b":685}'),
('DeepSeek R1', 'verified', 44.0, 210.3, 2294, 1, '2025-01-20', '{"provider":"deepseek","model_family":"deepseek-r","regions":["cn"],"parameters_b":685}'),

-- Qwen family
('Qwen 2.5 Coder', 'verified', 35.0, 72.6, 2294, 1, '2024-11-12', '{"provider":"alibaba","model_family":"qwen","regions":["cn"],"parameters_b":7}'),
('Qwen2.5-Coder-32B-Instruct', 'verified', 38.0, 85.2, 2294, 1, '2024-11-12', '{"provider":"alibaba","model_family":"qwen","regions":["cn"],"parameters_b":32}'),

-- Llama family
('Llama 3.3 70B', 'verified', 30.0, 68.4, 2294, 1, '2024-12-06', '{"provider":"meta","model_family":"llama","regions":["us"],"parameters_b":70}'),
('Llama 3.1 405B', 'verified', 28.0, 92.1, 2294, 1, '2024-07-23', '{"provider":"meta","model_family":"llama","regions":["us"],"parameters_b":405}'),
('Llama 4 Maverick', 'verified', 35.0, 76.8, 2294, 1, '2025-04-05', '{"provider":"meta","model_family":"llama","regions":["us"],"parameters_b":null}'),

-- Mistral
('Mistral Large 2', 'verified', 25.0, 71.3, 2294, 1, '2024-07-24', '{"provider":"mistral","model_family":"mistral","regions":["eu"],"parameters_b":123}'),
('Codestral', 'verified', 19.0, 45.2, 2294, 1, '2024-05-29', '{"provider":"mistral","model_family":"codestral","regions":["eu"],"parameters_b":22}'),

-- Gemini Flash 2.5
('Gemini 2.5 Flash', 'verified', 36.0, 38.7, 2294, 1, '2025-03-25', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),

-- Command R+
('Command R+', 'verified', 18.0, 58.9, 2294, 1, '2024-04-04', '{"provider":"cohere","model_family":"commandr","regions":["us"],"parameters_b":104}'),

-- GPT-4o-mini-high
('GPT-4o-mini (high)', 'verified', 24.0, 38.2, 2294, 1, '2024-10-01', '{"provider":"openai","model_family":"gpt4-mini","regions":["us","eu"],"parameters_b":120}'),

-- SWE-Bench Lite entries
('GPT-4o', 'lite', 55.0, 115.4, 300, 1, '2024-05-13', '{"provider":"openai","model_family":"gpt4","regions":["us"],"parameters_b":175}'),
('Claude 3.7 Sonnet', 'lite', 62.3, 102.5, 300, 1, '2025-02-24', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('DeepSeek R1', 'lite', 52.0, 185.2, 300, 1, '2025-01-20', '{"provider":"deepseek","model_family":"deepseek-r","regions":["cn"],"parameters_b":685}'),
('Llama 4 Maverick', 'lite', 44.0, 82.3, 300, 1, '2025-04-05', '{"provider":"meta","model_family":"llama","regions":["us"],"parameters_b":null}'),
('Gemini 2.5 Pro', 'lite', 50.0, 98.7, 300, 1, '2025-03-25', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),
('Qwen2.5-Coder-32B', 'lite', 45.0, 68.9, 300, 1, '2024-11-12', '{"provider":"alibaba","model_family":"qwen","regions":["cn"],"parameters_b":32}'),

-- SWE-Bench Full
('GPT-4o', 'full', 17.2, 48.5, 2294, 1, '2024-05-13', '{"provider":"openai","model_family":"gpt4","regions":["us"],"parameters_b":175}'),
('Claude 3.7 Sonnet', 'full', 23.1, 120.3, 2294, 1, '2025-02-24', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('DeepSeek R1', 'full', 18.8, 210.5, 2294, 1, '2025-01-20', '{"provider":"deepseek","model_family":"deepseek-r","regions":["cn"],"parameters_b":685}'),
('Gemini 2.5 Pro', 'full', 19.5, 135.2, 2294, 1, '2025-03-25', '{"provider":"google","model_family":"gemini","regions":["us","global"],"parameters_b":null}'),
('Llama 4 Maverick', 'full', 16.0, 110.8, 2294, 1, '2025-04-05', '{"provider":"meta","model_family":"llama","regions":["us"],"parameters_b":null}'),

-- Additional models for volume
('o1 (high)', 'verified', 42.0, 180.4, 2294, 1, '2024-12-05', '{"provider":"openai","model_family":"o1","regions":["us"],"parameters_b":null}'),
('o3-mini', 'verified', 41.0, 145.6, 2294, 1, '2025-01-31', '{"provider":"openai","model_family":"o3","regions":["us"],"parameters_b":null}'),
('o3', 'verified', 53.0, 320.1, 2294, 1, '2025-04-16', '{"provider":"openai","model_family":"o3","regions":["us"],"parameters_b":null}'),
('DeepSeek V3-0324', 'verified', 45.0, 62.3, 2294, 1, '2025-03-24', '{"provider":"deepseek","model_family":"deepseek","regions":["cn"],"parameters_b":685}'),
('Claude 4 Sonnet', 'verified', 54.2, 110.5, 2294, 1, '2025-06-12', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('Claude 4 Opus', 'verified', 58.1, 280.3, 2294, 1, '2025-06-12', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('GPT-4.1', 'verified', 47.0, 50.2, 2294, 1, '2025-05-14', '{"provider":"openai","model_family":"gpt4","regions":["us","eu"],"parameters_b":175}'),

-- Lite additional
('o3', 'lite', 63.0, 280.5, 300, 1, '2025-04-16', '{"provider":"openai","model_family":"o3","regions":["us"],"parameters_b":null}'),
('Claude 4 Opus', 'lite', 68.5, 250.2, 300, 1, '2025-06-12', '{"provider":"anthropic","model_family":"claude","regions":["us"],"parameters_b":null}'),
('DeepSeek V3-0324', 'lite', 55.0, 55.8, 300, 1, '2025-03-24', '{"provider":"deepseek","model_family":"deepseek","regions":["cn"],"parameters_b":685}');

-- Add updated_at timestamps for all records  
UPDATE swe_bench_evaluations SET updated_at = date_added;