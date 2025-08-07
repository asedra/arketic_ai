import React, { useState } from 'react';

interface AICardGeneratorProps {
  onGenerate: (cardJson: any) => void;
  onClose: () => void;
}

interface FormField {
  type: string;
  id: string;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  choices?: Array<{ title: string; value: string }>;
  isMultiSelect?: boolean;
  style?: string;
}

export const AICardGenerator: React.FC<AICardGeneratorProps> = ({ onGenerate, onClose }) => {
  const [userQuery, setUserQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);
  const [error, setError] = useState('');

  // AI form analizi - kullanıcı talebini analiz edip form alanları çıkarır
  const analyzeFormRequest = (query: string): FormField[] => {
    const fields: FormField[] = [];
    const queryLower = query.toLowerCase();

    // Tarih alanları tespiti
    if (queryLower.includes('tarih') || queryLower.includes('date')) {
      if (queryLower.includes('başlangıç') || queryLower.includes('start') || queryLower.includes('from')) {
        fields.push({
          type: 'Input.Date',
          id: 'startDate',
          label: 'Başlangıç Tarihi',
          isRequired: true
        });
      }
      if (queryLower.includes('bitiş') || queryLower.includes('bitiş') || queryLower.includes('end') || queryLower.includes('to')) {
        fields.push({
          type: 'Input.Date',
          id: 'endDate',
          label: 'Bitiş Tarihi',
          isRequired: true
        });
      }
      if (!queryLower.includes('başlangıç') && !queryLower.includes('bitiş') && !queryLower.includes('start') && !queryLower.includes('end')) {
        fields.push({
          type: 'Input.Date',
          id: 'date',
          label: 'Tarih',
          isRequired: true
        });
      }
    }

    // İsim/Ad alanları
    if (queryLower.includes('isim') || queryLower.includes('ad') || queryLower.includes('name')) {
      fields.push({
        type: 'Input.Text',
        id: 'fullName',
        label: 'Ad Soyad',
        placeholder: 'Adınızı ve soyadınızı giriniz',
        isRequired: true
      });
    }

    // Email alanları
    if (queryLower.includes('email') || queryLower.includes('e-mail') || queryLower.includes('eposta')) {
      fields.push({
        type: 'Input.Text',
        id: 'email',
        label: 'E-posta',
        placeholder: 'ornek@email.com',
        style: 'email',
        isRequired: true
      });
    }

    // Telefon alanları
    if (queryLower.includes('telefon') || queryLower.includes('phone') || queryLower.includes('mobile')) {
      fields.push({
        type: 'Input.Text',
        id: 'phone',
        label: 'Telefon Numarası',
        placeholder: '+90 5xx xxx xx xx',
        style: 'tel',
        isRequired: true
      });
    }

    // Neden/Açıklama alanları
    if (queryLower.includes('neden') || queryLower.includes('reason') || queryLower.includes('açıklama') || queryLower.includes('description')) {
      fields.push({
        type: 'Input.Text',
        id: 'reason',
        label: queryLower.includes('izin') ? 'İzin Nedeni' : 'Açıklama',
        placeholder: 'Detaylı açıklama yazınız...',
        isMultiline: true,
        isRequired: true
      });
    }

    // Departman/Bölüm alanları
    if (queryLower.includes('departman') || queryLower.includes('department') || queryLower.includes('bölüm')) {
      fields.push({
        type: 'Input.ChoiceSet',
        id: 'department',
        label: 'Departman',
        placeholder: 'Departmanınızı seçiniz',
        choices: [
          { title: 'İnsan Kaynakları', value: 'hr' },
          { title: 'Bilgi İşlem', value: 'it' },
          { title: 'Pazarlama', value: 'marketing' },
          { title: 'Satış', value: 'sales' },
          { title: 'Muhasebe', value: 'accounting' },
          { title: 'Üretim', value: 'production' }
        ],
        style: 'compact',
        isRequired: true
      });
    }

    // Öncelik alanları
    if (queryLower.includes('öncelik') || queryLower.includes('priority') || queryLower.includes('acil')) {
      fields.push({
        type: 'Input.ChoiceSet',
        id: 'priority',
        label: 'Öncelik',
        placeholder: 'Öncelik seviyesi seçiniz',
        choices: [
          { title: 'Düşük', value: 'low' },
          { title: 'Orta', value: 'medium' },
          { title: 'Yüksek', value: 'high' },
          { title: 'Acil', value: 'urgent' }
        ],
        style: 'compact',
        isRequired: true
      });
    }

    // Durum alanları
    if (queryLower.includes('durum') || queryLower.includes('status') || queryLower.includes('onay')) {
      fields.push({
        type: 'Input.ChoiceSet',
        id: 'status',
        label: 'Durum',
        choices: [
          { title: 'Beklemede', value: 'pending' },
          { title: 'Onaylandı', value: 'approved' },
          { title: 'Reddedildi', value: 'rejected' }
        ],
        style: 'expanded',
        isRequired: true
      });
    }

    // Miktar/Sayı alanları
    if (queryLower.includes('miktar') || queryLower.includes('sayı') || queryLower.includes('amount') || queryLower.includes('quantity')) {
      fields.push({
        type: 'Input.Number',
        id: 'amount',
        label: 'Miktar',
        placeholder: '0',
        isRequired: true
      });
    }

    // Saat alanları
    if (queryLower.includes('saat') || queryLower.includes('time')) {
      fields.push({
        type: 'Input.Time',
        id: 'time',
        label: 'Saat',
        isRequired: true
      });
    }

    // Onay/Kabul alanları
    if (queryLower.includes('kabul') || queryLower.includes('onay') || queryLower.includes('agree')) {
      fields.push({
        type: 'Input.Toggle',
        id: 'agreement',
        title: 'Şartları kabul ediyorum',
        value: 'false',
        isRequired: true
      });
    }

    return fields;
  };

  // Form türünü belirle
  const detectFormType = (query: string): { title: string; description: string } => {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('izin') || queryLower.includes('leave')) {
      return {
        title: '📅 İzin Başvuru Formu',
        description: 'İzin talebinizi bu form ile iletebilirsiniz'
      };
    }
    if (queryLower.includes('başvuru') || queryLower.includes('application')) {
      return {
        title: '📝 Başvuru Formu',
        description: 'Başvurunuzu bu form ile yapabilirsiniz'
      };
    }
    if (queryLower.includes('talep') || queryLower.includes('request')) {
      return {
        title: '🎯 Talep Formu',
        description: 'Talebinizi bu form ile iletebilirsiniz'
      };
    }
    if (queryLower.includes('şikayet') || queryLower.includes('complaint')) {
      return {
        title: '📢 Şikayet Formu',
        description: 'Şikayetinizi bu form ile iletebilirsiniz'
      };
    }
    if (queryLower.includes('feedback') || queryLower.includes('geri bildirim')) {
      return {
        title: '💬 Geri Bildirim Formu',
        description: 'Geri bildiriminizi bu form ile paylaşabilirsiniz'
      };
    }
    if (queryLower.includes('kayıt') || queryLower.includes('registration')) {
      return {
        title: '👤 Kayıt Formu',
        description: 'Kayıt işleminizi bu form ile tamamlayabilirsiniz'
      };
    }

    return {
      title: '📋 Form',
      description: 'Bilgilerinizi bu form ile iletebilirsiniz'
    };
  };

  // OpenAI API ile gelişmiş AI analizi
  const generateCardWithAI = async () => {
    setError('');
    setIsGenerating(true);

    try {
      const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openAIKey || openAIKey === 'your_openai_api_key_here') {
        // Fallback: Kural tabanlı sistem
        generateCardLocal();
        return;
      }

      const prompt = `
Kullanıcı talebi: "${userQuery}"

Bu talebe göre bir Adaptive Card JSON oluştur. Şu kurallara uy:

1. Form türünü analiz et (izin, başvuru, şikayet vs.)
2. Gerekli form alanlarını belirle:
   - Tarih alanları için Input.Date
   - Metin alanları için Input.Text (uzun metinler için isMultiline: true)
   - Sayı alanları için Input.Number  
   - Email için Input.Text + style: "email"
   - Telefon için Input.Text + style: "tel"
   - Seçim listesi için Input.ChoiceSet
   - Onay için Input.Toggle
   - Saat için Input.Time

3. Türkçe etiketler kullan
4. Uygun placeholder'lar ekle
5. Önemli alanları isRequired: true yap
6. Başlık ve açıklama ekle
7. Submit ve Draft kaydetme action'ları ekle

JSON formatında direkt Adaptive Card döndür, başka açıklama yapma.
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sen bir Adaptive Card uzmanısın. Kullanıcı taleplerini analiz edip Microsoft Adaptive Cards formatında JSON oluşturursun.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // JSON'u parse et
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
      
      const adaptiveCard = JSON.parse(jsonStr);
      
      // Validation
      if (!adaptiveCard.type || adaptiveCard.type !== 'AdaptiveCard') {
        throw new Error('AI tarafından geçersiz Adaptive Card oluşturuldu');
      }

      setGeneratedCard(adaptiveCard);
      setIsGenerating(false);

    } catch (error) {
      console.error('AI Generation Error:', error);
      // Fallback: Kural tabanlı sistem
      generateCardLocal();
    }
  };

  // Kural tabanlı local generation (fallback)
  const generateCardLocal = () => {
    try {
      // Kullanıcı sorgusu boşsa
      if (!userQuery.trim()) {
        setError('❌ Lütfen form talebinizi yazınız');
        setIsGenerating(false);
        return;
      }

      // AI analizi
      const formType = detectFormType(userQuery);
      const fields = analyzeFormRequest(userQuery);

      // En az bir alan bulunamazsa
      if (fields.length === 0) {
        // Varsayılan alanlar ekle
        fields.push({
          type: 'Input.Text',
          id: 'fullName',
          label: 'Ad Soyad',
          placeholder: 'Adınızı ve soyadınızı giriniz',
          isRequired: true
        });
        fields.push({
          type: 'Input.Text',
          id: 'description',
          label: 'Açıklama',
          placeholder: 'Detaylı açıklama yazınız...',
          isMultiline: true,
          isRequired: true
        });
      }

      // Adaptive Card oluştur
      const adaptiveCard = {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          // Header
          {
            type: 'TextBlock',
            text: formType.title,
            size: 'Large',
            weight: 'Bolder',
            color: 'Accent'
          },
          {
            type: 'TextBlock',
            text: formType.description,
            isSubtle: true,
            wrap: true,
            spacing: 'Small'
          },
          // Separator
          {
            type: 'Container',
            separator: true,
            spacing: 'Medium',
            items: []
          },
          // Form Fields
          ...fields.map(field => ({
            type: field.type,
            id: field.id,
            label: field.label,
            placeholder: field.placeholder,
            isRequired: field.isRequired,
            isMultiline: field.type === 'Input.Text' && field.isMultiline,
            style: field.style,
            choices: field.choices,
            isMultiSelect: field.isMultiSelect,
            spacing: 'Medium'
          }))
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: '✅ Gönder',
            style: 'positive',
            data: {
              action: 'submit',
              formType: formType.title.toLowerCase().replace(/[^\w]/g, '_')
            }
          },
          {
            type: 'Action.Submit',
            title: '💾 Taslak Kaydet',
            data: {
              action: 'saveDraft',
              formType: formType.title.toLowerCase().replace(/[^\w]/g, '_')
            }
          }
        ]
      };

      setGeneratedCard(adaptiveCard);
      
      // Simüle edilen AI işlem süresi
      setTimeout(() => {
        setIsGenerating(false);
      }, 1500);

    } catch (error) {
      setError(`❌ Card oluşturulurken hata: ${(error as Error).message}`);
      setIsGenerating(false);
    }
  };

  // Ana generation fonksiyonu
  const generateCard = () => {
    generateCardWithAI();
  };

  const handleImport = () => {
    if (generatedCard) {
      onGenerate(generatedCard);
      onClose();
    }
  };

  // Örnek talepler
  const exampleRequests = [
    {
      text: "İzin formu istiyorum. İçerisinde izin başlangıç tarihi, izin bitiş tarihi, izin nedeni olsun",
      icon: "📅"
    },
    {
      text: "Başvuru formu oluştur. Ad soyad, email, telefon, departman ve açıklama alanları olsun",
      icon: "📝"
    },
    {
      text: "Şikayet formu yapmak istiyorum. İsim, email, şikayet konusu ve detaylı açıklama olsun",
      icon: "📢"
    },
    {
      text: "Kayıt formu oluştur. Ad soyad, email, telefon, departman, onay checkbox'ı olsun",
      icon: "👤"
    },
    {
      text: "Talep formu istiyorum. İsim, departman, talep türü, öncelik seviyesi ve açıklama olsun",
      icon: "🎯"
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '900px',
        maxHeight: '90vh',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🤖 AI Adaptive Card Generator
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              color: '#6b7280'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: '1px solid #667eea30',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '18px' }}>
            🎯 Nasıl Çalışır?
          </h3>
          <p style={{ margin: 0, color: '#6b7280', lineHeight: '1.6' }}>
            Form talebinizi doğal dilde yazın. AI sistemi otomatik olarak gerekli form alanlarını analiz edip 
            size özel bir Adaptive Card oluşturur. Örneğin: <strong>"İzin formu istiyorum, başlangıç tarihi, bitiş tarihi ve neden olsun"</strong>
          </p>
        </div>

        {/* Input Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Form Talebinizi Yazın:
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Örnek: İzin formu istiyorum. İçerisinde izin başlangıç tarihi, izin bitiş tarihi, izin nedeni olsun..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              {userQuery.length}/500
            </div>
          </div>
        </div>

        {/* Example Requests */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            💡 Örnek Talepler:
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '8px' 
          }}>
            {exampleRequests.map((example, index) => (
              <button
                key={index}
                onClick={() => setUserQuery(example.text)}
                style={{
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  color: '#374151',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{example.icon}</span>
                  <span>{example.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateCard}
          disabled={isGenerating || !userQuery.trim()}
          style={{
            padding: '16px 24px',
            background: isGenerating ? '#9ca3af' : 
                       !userQuery.trim() ? '#d1d5db' :
                       'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: isGenerating || !userQuery.trim() ? 'not-allowed' : 'pointer',
            fontSize: '18px',
            fontWeight: '600',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isGenerating ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff50',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              AI Oluşturuyor...
            </>
          ) : (
            <>
              🚀 AI ile Form Oluştur
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Generated Card Preview */}
        {generatedCard && !isGenerating && (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#059669' }}>
                ✅ Form Başarıyla Oluşturuldu!
              </h4>
              <button
                onClick={handleImport}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                🎨 Designer'a Aktar
              </button>
            </div>
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <pre style={{
                fontSize: '12px',
                fontFamily: 'Monaco, Consolas, monospace',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}>
                {JSON.stringify(generatedCard, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};