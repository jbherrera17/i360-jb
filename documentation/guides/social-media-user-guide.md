# Social Media User Guide

**For:** Insight 360 Users
**Last Updated:** 2026-02-25

---

## Why Social Media Publishing Is Important

Consistent social media presence drives awareness, authority, and pipeline — but publishing across eight platforms manually is time-consuming and error-prone. The Social Media module lets your team publish to Twitter/X, LinkedIn, Instagram, TikTok, Facebook, YouTube, Pinterest, and Threads from a single interface, with content automatically adapted to each platform's format, character limits, and hashtag rules.

Because the module is wired directly into the Thought Leadership module, content your team creates in Insight 360 can flow straight to social channels without copying and pasting between tools.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Connect accounts** | Link your organisation's social profiles through a secure OAuth flow handled by Postiz |
| **Compose posts** | Write content once and let the platform adapt it for every selected channel |
| **Preview adaptations** | See exactly how your post will appear on each platform before publishing |
| **Publish immediately** | Send to one or more platforms with a single click |
| **Schedule posts** | Pick a future date and time; Postiz handles delivery |
| **Cancel scheduled posts** | Remove a scheduled post before it goes out |
| **View history** | Review all published and failed posts in one place |
| **Track analytics** | Monitor impressions, likes, comments, shares, clicks, and reach across platforms |
| **Import from Thought Leadership** | Open your TL content library to use existing articles as post source material |

---

## Subscription Requirements

Social Media Publishing is included from the **Business tier** and above. Starter tier organisations can add it as a paid add-on.

### Included Tier Limits

| Tier | Monthly Posts | Connected Channels |
|------|--------------|-------------------|
| Starter | Not included | Not included |
| Business | 500 | 5 |
| Enterprise | 2,000 | 15 |
| Agency Starter | 1,000 | 15 |
| Agency Professional | 5,000 | 50 |
| Agency Enterprise | Unlimited | Unlimited |

### Starter Tier Add-On

Starter tier organisations can unlock Social Media Publishing as an **optional add-on**:

- **$29/month** or **$290/year**
- Includes 100 posts per month and 3 connected channels
- Contact your administrator to purchase this add-on

### What Counts Toward Your Monthly Post Limit

Every post you submit — whether published immediately or scheduled for later — counts as one post toward your monthly allowance. Cancelled posts do not count. The counter resets at the beginning of each calendar month.

---

## Step by Step Use

### First-Time Setup (Admins Only)

Before anyone on your team can publish, an organisation owner or admin must configure the Postiz connection.

1. Open the **Social Media** page from the navigation sidebar.
2. If the setup banner appears ("Social Publishing Not Configured"), click **Configure Social Publishing**.
3. In the dialog, enter:
   - **Postiz Organization ID** — found in your Postiz dashboard
   - **Postiz API Key** — the Bearer token from your Postiz settings
4. Click **Save Configuration**.
5. The banner disappears once the configuration is saved successfully.

### Connecting a Social Platform Account

1. Click the **Connected Accounts** tab (the default tab when the page loads).
2. Find the platform card you want to connect — all eight platforms are shown, each indicating whether it is connected or not.
3. Click **Connect** on the platform card.
4. A popup window opens to complete the OAuth authorisation on that platform's website.
5. Follow the platform's login and permission prompts.
6. After authorising, close the popup. Click **Sync Accounts** (if available) or reload the page to confirm the connection status updates.

Connected accounts show a green border and a "Connected" badge. The account name or handle appears beneath the badge.

### Composing and Publishing a Post

1. Click the **Compose** tab, or click the **New Post** button in the page header.
2. A **usage bar** near the top of the Compose tab shows your current posts-this-month and connected channels against your plan limits. The bar colour turns amber when you are over 70% of a limit and red when over 90%.
3. **Select Platforms** — click the platform badges at the top of the compose editor to select which accounts to publish to. Disconnected platforms appear greyed out and cannot be selected.
4. **Write your content** in the text area. The character counter below updates as you type, showing the most restrictive limit across your selected platforms.
5. **Add hashtags** — enter them comma-separated in the Hashtags field (the `#` prefix is added automatically if you omit it).
6. **Add an article link** (optional) — paste a URL if this post accompanies a published article. The adapter appends the link appropriately for each platform.
7. **Choose when to publish:**
   - Select **Publish Now** to send immediately.
   - Select **Schedule** and pick a date and time to queue the post for future delivery.
8. Click **Preview** to see how the content will be adapted for each selected platform. The right-hand sidebar shows the adapted text, thread indicators (Twitter), and media requirements (Instagram, TikTok, Pinterest).
9. Click **Publish** (or **Schedule** if you chose a future time) to submit.
10. A success toast confirms the post was created. The usage bar refreshes automatically. You are taken to the History or Scheduled tab automatically.

### Importing Content from Thought Leadership

1. In the Compose tab, click **Import from TL**.
2. The Thought Leadership page opens in a new tab.
3. Copy the content you want to use and return to the Compose tab to paste it.

### Viewing and Managing Scheduled Posts

1. Click the **Scheduled** tab.
2. Each scheduled post shows the target platforms, content preview, and scheduled date/time.
3. To cancel a scheduled post, click the **Cancel** button on the post card and confirm in the dialog.

### Reviewing Publish History

1. Click the **History** tab.
2. Posts with **published** or **failed** status appear here.
3. Failed posts show the error message to help with troubleshooting.

### Reading Analytics

1. Click the **Analytics** tab.
2. The dashboard shows aggregated metrics for the last 30 days:
   - **Total Posts**, **Published**, and **Scheduled** counts
   - **Impressions**, **Likes**, **Comments**, **Shares**, and **Reach**
   - **Posts by Platform** breakdown
3. Analytics data is populated as Postiz retrieves engagement metrics from each platform after publication.

---

## How Content Is Adapted Per Platform

When you click **Preview** or submit a post, Insight 360 automatically reformats your content for each platform:

| Platform | Key Adaptations |
|----------|----------------|
| **Twitter / X** | Truncates to 280 characters. If content exceeds the limit, it is automatically split into a numbered thread. Up to 3 hashtags are appended. Article URL is counted as 23 characters (t.co format). |
| **LinkedIn** | Up to 3,000 characters. Up to 5 hashtags. Article title and URL are appended with a book emoji when provided. |
| **Instagram** | Up to 2,200 characters and up to 30 hashtags. Hashtags are separated from the caption by three dots. Images are required — the preview warns you if none are attached. |
| **TikTok** | Up to 2,200 characters and up to 30 hashtags. Video is required. |
| **Facebook** | Very generous limit (63,206 characters). Article link appended with a chain emoji. Up to 5 hashtags. |
| **YouTube** | Title extracted from article title or first line (max 100 characters). Description up to 5,000 characters. Up to 15 hashtags, also added as YouTube tags. |
| **Pinterest** | Title (100 characters) and description (500 characters). Requires an image. Article URL set as the pin's link. |
| **Threads** | Up to 500 characters. Up to 5 hashtags. Up to 10 images. |

---

## Tips and Best Practices

- **Write for the most restrictive platform first.** If you are targeting Twitter, keep your draft under 280 characters so it publishes as a single tweet. For longer content, let the thread splitter handle it automatically.
- **Use the Preview sidebar before publishing.** It shows precisely what each platform will receive, including thread splits and media warnings.
- **Add an article link when you have one.** The adapter positions it correctly for each platform — at the end of LinkedIn posts, in YouTube descriptions, and as the pin link on Pinterest.
- **Hashtags in the Hashtags field are smarter.** The adapter enforces per-platform limits (3 for Twitter, 30 for Instagram, 5 for LinkedIn). Keep your list under 30 to cover all platforms.
- **Connect accounts before composing.** Disconnected platforms appear greyed out in the composer and cannot be selected.
- **Use the Sync Accounts action after adding a new account in Postiz.** This pulls the latest connection status into Insight 360 without a full page reload.
- **Schedule during off-peak hours.** Postiz can suggest optimal posting times (ask your admin to surface this if needed).
- **Instagram and Pinterest require media.** The preview sidebar flags this with an "Image required" badge. Attach an image before submitting.
- **TikTok requires a video attachment.** Text-only posts will be flagged in the preview.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Social Publishing Not Configured" banner appears | An organisation admin must configure the Postiz Organisation ID and API Key using the **Configure Social Publishing** button |
| Platform shows "Not Connected" | Click **Connect** on the platform card and complete the OAuth flow in the popup window. If the popup is blocked, allow popups for this site in your browser. |
| Character counter shows "over limit" in red | Your content exceeds the most restrictive limit among selected platforms. Shorten the text, remove platforms with tight limits, or let the thread splitter handle it for Twitter. |
| Post shows as **failed** in History | Click the post to see the error message. Common causes: media file not attached (Instagram, Pinterest, TikTok), account token expired (reconnect the platform), or Postiz service temporarily unavailable. |
| Preview shows "Preview failed" | Ensure at least one platform is selected and content is entered. If it persists, the preview API may be temporarily unavailable — you can still publish. |
| Published post is not appearing on the platform | Allow a few minutes for propagation. If it continues, check the History tab for an error status. Token expiry is the most common cause — reconnect the platform and repost. |
| Analytics shows zeros | Analytics are populated asynchronously after Postiz retrieves metrics from each platform. This may take several hours for some platforms. |
| "Monthly post limit reached" error when publishing | Your organisation has used all posts allowed this calendar month. The limit resets on the first of next month. Contact your administrator to upgrade the subscription tier, or purchase the Social Publishing add-on if you are on Starter. |
| Usage bar shows 0 / 0 with no meter | Your tier does not include Social Publishing and no add-on is active. Contact your administrator. |
| Usage bar turns red | You are above 90% of your post or channel limit. Plan ahead — once 100% is reached, new posts will be blocked until next month. |
| Sync Accounts returns a channel limit warning | The response includes a warning message when your channel usage reaches 80% of your plan limit. You are not blocked from syncing, but should consider whether you need to upgrade. |
| "Social Media Publishing requires Business tier" error | Your organisation's subscription plan does not include this module. Contact your administrator to upgrade, or purchase the Social Publishing add-on. |
| Popup blocked when connecting platform | Enable popups for the Insight 360 domain in your browser settings and retry the **Connect** action. |
