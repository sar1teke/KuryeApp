// src/utils/printService.js

/**
 * Sipariş detaylarına göre 80mm termal fiş (Adisyon) formatında bir HTML oluşturur
 * ve tarayıcının yazdırma arayüzünü (print()) tetikler.
 * 
 * @param {Object} siparis Yazdırılacak sipariş nesnesi
 */
export const adisyonYazdir = (siparis) => {
    if (!siparis) return;
    
    const odeme = siparis.odemeYontemi || siparis.odeme_yontemi || 'Nakit';
    
    // HTML Template
    const htmlInhalt = `
      <html>
      <head>
        <title>Adisyon #${siparis.id}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 80mm; 
            margin: 0 auto; 
            padding: 12px; 
            font-size: 13px; 
            color: #222; 
          }
          .header { 
            text-align: center; 
            border-bottom: 2px dashed #999; 
            padding-bottom: 12px; 
            margin-bottom: 10px; 
          }
          .header h1 { font-size: 20px; margin: 0; }
          .header .id { font-size: 14px; color: #666; margin-top: 4px; font-weight: bold; }
          .header .date { font-size: 11px; color: #888; }
          
          .info { 
            margin: 10px 0; 
            border-bottom: 1px dashed #ccc; 
            padding-bottom: 10px; 
          }
          .info div { margin: 3px 0; font-size: 13px; }
          .info .label { color: #888; display: inline-block; width: 60px; font-weight: bold;}
          
          .items { 
            margin: 10px 0; 
            border-bottom: 1px dashed #ccc; 
            padding-bottom: 10px; 
          }
          .items .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 4px 0; 
            font-size: 13px; 
          }
          
          .total { 
            text-align: right; 
            font-size: 20px; 
            font-weight: bold; 
            padding: 10px 0; 
            border-top: 2px dashed #999; 
            margin-top: 5px; 
          }
          
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            font-size: 11px; 
            color: #aaa; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>☕ SİPARİŞ</h1>
          <div class="id">#${siparis.id}</div>
          <div class="date">${new Date().toLocaleString('tr-TR')}</div>
        </div>
        
        <div class="info">
          <div><span class="label">Müşteri</span>${siparis.musteriAdi}</div>
          <div><span class="label">Tel</span>${siparis.telefon || '-'}</div>
          <div><span class="label">Adres</span>${siparis.adres || '-'}</div>
          <div><span class="label">Ödeme</span>${odeme}</div>
          ${siparis.kurye_adi ? `<div><span class="label">Kurye</span>${siparis.kurye_adi}</div>` : ''}
          ${siparis.notlar ? `<div><span class="label">Not</span>${siparis.notlar}</div>` : ''}
        </div>
        
        <div class="items">
          ${(siparis.icerik || []).map(i => `<div class="item"><span>• ${i}</span></div>`).join('')}
        </div>
        
        <div class="total">YEKÜN: ₺${parseFloat(siparis.tutar || 0).toFixed(2)}</div>
        
        <div class="footer">Afiyet Olsun! 🍽️</div>
      </body>
      </html>
    `;
  
    // Yeni pencere aç ve yazdır
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(htmlInhalt);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    } else {
        console.error("Yazdırma penceresi açılamadı. Lütfen popup engelleyicinizi kontrol edin.");
    }
  };
