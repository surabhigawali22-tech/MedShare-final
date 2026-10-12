import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appName: 'MedShare',
      tagline: 'Medicine Donation & Expiry Management',
      zeroWaste: 'Zero-Waste Healthcare Logistics',
      browseSurplus: 'Browse Surplus',
      myDonations: 'My Donations',
      myCabinet: 'Medicine Cabinet',
      disposalQueue: 'Disposal Queue',
      urgentNeeds: 'Urgent Needs',
      impact: 'Impact & Leaderboard',
      verificationQueue: 'Verification Queue',
      adminPortal: 'Admin Portal',
      publicTrail: 'Batch Trail',
      scanQr: 'Scan Handover QR',
      donateMedicine: 'Donate Medicine',
      searchPlaceholder: 'Search medicines, generic names, or batch numbers...',
      safetyScore: 'Safety Score',
      daysRemaining: 'days remaining',
      requestMedicine: 'Request Stock',
      viewMatches: 'Shelf-Life Matches',
      nearExpiryRescue: 'NEAR-EXPIRY RESCUE',
      rxOnly: 'Rx Only',
      coldChain: 'Cold-Chain (2-8°C)',
      roomTemp: 'Room Temp',
      sealedOriginal: 'Sealed Original',
      category: 'Category',
      quantity: 'Quantity',
      expiryDate: 'Expiry Date',
      batchNo: 'Batch No',
      status: 'Status',
      actions: 'Actions',
      disclaimer: 'Prototype platform: MedShare coordinates donation logistics and does not replace statutory pharmacist review or regulatory checks.',
      donor: 'Donor',
      recipient: 'Recipient',
      verifier: 'Verifier',
      admin: 'Admin',
      login: 'Sign In',
      register: 'Register',
      logout: 'Sign Out'
    }
  },
  hi: {
    translation: {
      appName: 'मेदशीयर',
      tagline: 'दवा दान और समाप्ति प्रबंधन',
      zeroWaste: 'शून्य अपशिष्ट स्वास्थ्य सेवा',
      browseSurplus: 'उपलब्ध दवाएं देखें',
      myDonations: 'मेरे दान',
      myCabinet: 'मेरी दवा अलमारी',
      disposalQueue: 'निपटान कतार',
      urgentNeeds: 'अति आवश्यक मांगें',
      impact: 'प्रभाव और लीडरबोर्ड',
      verificationQueue: 'सत्यापन कतार',
      adminPortal: 'प्रशासक पोर्टल',
      publicTrail: 'बैच ट्रेल',
      scanQr: 'हैंडओवर क्यूआर स्कैन करें',
      donateMedicine: 'दवा दान करें',
      searchPlaceholder: 'दवा का नाम, जेनेरिक नाम या बैच खोजें...',
      safetyScore: 'सुरक्षा स्कोर',
      daysRemaining: 'दिन शेष',
      requestMedicine: 'दवा का अनुरोध करें',
      viewMatches: 'शेल्फ-लाइफ मिलान',
      nearExpiryRescue: 'निकट-समाप्ति बचाव',
      rxOnly: 'केवल पर्चे पर',
      coldChain: 'कोल्ड-चेन (2-8°C)',
      roomTemp: 'सामान्य तापमान',
      sealedOriginal: 'मूल सीलबंद',
      category: 'श्रेणी',
      quantity: 'मात्रा',
      expiryDate: 'समाप्ति तिथि',
      batchNo: 'बैच संख्या',
      status: 'स्थिति',
      actions: 'कार्रवाई',
      disclaimer: 'प्रोटोटाइप प्लेटफॉर्म: मेदशीयर दवा दान समन्वय करता है और फार्मासिस्ट समीक्षा का विकल्प नहीं है।',
      donor: 'दाता',
      recipient: 'प्राप्तकर्ता',
      verifier: 'सत्यापनकर्ता',
      admin: 'व्यवस्थापक',
      login: 'लॉग इन करें',
      register: 'पंजीकरण करें',
      logout: 'लॉग आउट'
    }
  },
  mr: {
    translation: {
      appName: 'मेडशेअर',
      tagline: 'औषध दान आणि मुदत संपणे व्यवस्थापन',
      zeroWaste: 'शून्य कचरा आरोग्य सेवा',
      browseSurplus: 'उपलब्ध औषधे पहा',
      myDonations: 'माझे दान',
      myCabinet: 'माझे औषध कपाट',
      disposalQueue: 'विल्हेवाट रांग',
      urgentNeeds: 'तातडीच्या गरजा',
      impact: 'प्रभाव आणि लीडरबोर्ड',
      verificationQueue: 'पडताळणी रांग',
      adminPortal: 'प्रशासक पोर्टल',
      publicTrail: 'बॅच ट्रेल',
      scanQr: 'हँडओव्हर QR स्कॅन करा',
      donateMedicine: 'औषध दान करा',
      searchPlaceholder: 'औषधाचे नाव किंवा बॅच शोधा...',
      safetyScore: 'सुरक्षा गुण',
      daysRemaining: 'दिवस शिल्लक',
      requestMedicine: 'औषधाची विनंती करा',
      viewMatches: 'शेल्फ-लाइफ जुळणी',
      nearExpiryRescue: 'मुदत संपण्याआधी बचाव',
      rxOnly: 'केवळ प्रिस्क्रिप्शनवर',
      coldChain: 'कोल्ड-चेन (2-8°C)',
      roomTemp: 'खोलीचे तापमान',
      sealedOriginal: 'मूळ सीलबंद',
      category: 'प्रवर्ग',
      quantity: 'प्रमाण',
      expiryDate: 'मुदत समाप्ती',
      batchNo: 'बॅच क्र.',
      status: 'स्थिती',
      actions: 'कृती',
      disclaimer: 'प्रोटोटाइप प्लॅटफॉर्म: मेडशेअर औषध दान समन्वय करते आणि फार्मासिस्ट पुनरावलोकनाचा पर्याय नाही.',
      donor: 'दाता',
      recipient: 'स्वीकारणारा',
      verifier: 'पडताळणी अधिकारी',
      admin: 'प्रशासक',
      login: 'साइन इन',
      register: 'नोंदणी करा',
      logout: 'साइन आउट'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('medshare_lng') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
