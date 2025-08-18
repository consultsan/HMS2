# 📱 WhatsApp Business API Debugging Guide

## 🚨 Issue: Messages Sent Successfully But Not Received

Your WhatsApp messages are being sent successfully (you're getting a successful API response), but recipients are not receiving them. Here's a comprehensive debugging guide.

## 🔍 **Common Causes & Solutions**

### 1. **Phone Number Format Issues** 📞

**Problem:** Phone numbers must be in international format without special characters.

**Solution:**

- ✅ Correct: `919680032837` (India)
- ❌ Wrong: `+919680032837`, `0968032837`, `968032837`

**Test with:**

```bash
curl -X POST http://localhost:3000/api/test-whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "919680032837",
    "message": "Test message from HMS2"
  }'
```

### 2. **WhatsApp Business API Configuration** ⚙️

**Check these environment variables:**

```env
WA_PHONE_NUMBER_ID=your_phone_number_id
WA_CLOUD_API_ACCESS_TOKEN=your_access_token
```

**Verify in Meta Developer Console:**

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Check your WhatsApp Business API app
3. Verify Phone Number ID and Access Token
4. Ensure the phone number is verified and active

### 3. **Message Template Approval** 📋

**For Business Accounts:**

- Messages must use pre-approved templates for the first 24 hours
- After 24 hours, you can send free-form messages

**Check Template Status:**

```bash
curl -X GET "https://graph.facebook.com/v18.0/{phone-number-id}/message_templates" \
  -H "Authorization: Bearer {access-token}"
```

### 4. **Recipient Phone Number Issues** 📱

**Common Problems:**

- Phone number not registered on WhatsApp
- User has blocked the business number
- Phone number is invalid or inactive

**Test Steps:**

1. Verify the phone number exists on WhatsApp
2. Try sending to a different verified number
3. Check if the user has blocked your business number

### 5. **API Version Issues** 🔄

**Current Configuration:**

```typescript
const WHATSAPP_CLOUD_API_VERSION = "latest";
```

**Try Specific Version:**

```typescript
const WHATSAPP_CLOUD_API_VERSION = "v18.0";
```

## 🛠️ **Enhanced Debugging Tools**

### 1. **Phone Number Validation**

```typescript
// Add this to your test route
router.post("/validate-phone", async (req, res) => {
	const { phoneNumber } = req.body;

	try {
		const formatted = formatPhoneNumber(phoneNumber);
		res.json({
			original: phoneNumber,
			formatted: formatted,
			valid: true
		});
	} catch (error) {
		res.json({
			original: phoneNumber,
			error: error.message,
			valid: false
		});
	}
});
```

### 2. **Message Status Check**

```typescript
// Add this to check message delivery status
async function checkMessageStatus(messageId: string) {
	const url = `https://graph.facebook.com/v18.0/${messageId}`;

	try {
		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${ACCESS_TOKEN}`
			}
		});

		console.log("Message status:", response.data);
		return response.data;
	} catch (error) {
		console.error("Error checking message status:", error);
		return null;
	}
}
```

## 🧪 **Testing Checklist**

### ✅ **Environment Setup**

- [ ] `WA_PHONE_NUMBER_ID` is set correctly
- [ ] `WA_CLOUD_API_ACCESS_TOKEN` is valid and not expired
- [ ] Phone number is verified in Meta Developer Console

### ✅ **Phone Number Testing**

- [ ] Test with international format: `919680032837`
- [ ] Verify recipient has WhatsApp installed
- [ ] Test with a different phone number
- [ ] Check if recipient has blocked business number

### ✅ **Message Content Testing**

- [ ] Test with simple text message
- [ ] Avoid special characters initially
- [ ] Test with approved message template
- [ ] Check message length (should be under 4096 characters)

### ✅ **API Response Analysis**

- [ ] Check for `error` field in response
- [ ] Verify `message_id` is generated
- [ ] Monitor message delivery status
- [ ] Check Meta Developer Console logs

## 🔧 **Quick Fixes to Try**

### 1. **Update API Version**

```typescript
// Change from "latest" to specific version
const WHATSAPP_CLOUD_API_VERSION = "v18.0";
```

### 2. **Add Message Template**

```typescript
// For first-time messages, use a template
const messageData = {
	messaging_product: "whatsapp",
	to: formattedPhoneNumber,
	type: "template",
	template: {
		name: "hello_world",
		language: {
			code: "en_US"
		}
	}
};
```

### 3. **Add Error Handling**

```typescript
// Enhanced error handling
if (response.data.error) {
	console.error("WhatsApp API Error:", response.data.error);
	return { success: false, error: response.data.error };
}
```

## 📞 **Contact Support**

If issues persist:

1. Check [Meta WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
2. Review [WhatsApp Business API Status](https://developers.facebook.com/support/bugs/)
3. Contact Meta Developer Support

## 🎯 **Next Steps**

1. **Immediate:** Test with the updated phone number formatting
2. **Short-term:** Verify WhatsApp Business API configuration
3. **Medium-term:** Implement message status tracking
4. **Long-term:** Add comprehensive error handling and logging

---

**Last Updated:** $(date)
**Status:** Debugging in progress
