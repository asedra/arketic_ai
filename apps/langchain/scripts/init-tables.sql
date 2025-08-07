-- Create chat_messages table for LangChain service
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    ai_model_used VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);

-- Insert sample data for testing
INSERT INTO chat_messages (chat_id, user_id, content, message_type, ai_model_used, tokens_used, processing_time_ms) 
VALUES 
('chat-test-001', 'user-123', 'Merhaba, nasılsın?', 'text', 'gpt-4', 15, 850),
('chat-test-001', 'assistant', 'Merhaba! Ben bir AI asistanıyım, iyiyim teşekkür ederim. Size nasıl yardımcı olabilirim?', 'text', 'gpt-4', 32, 1200),
('chat-test-002', 'user-456', 'JavaScript hakkında soru sormak istiyorum.', 'text', 'gpt-3.5-turbo', 18, 650)
ON CONFLICT DO NOTHING;