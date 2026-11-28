# 07 · Oracle Cloud account setup (for the Live Studio)

> **For:** the owner, before the Live Studio spike (S0). Plan: `06-live-studio-plan.md`.
> **Written:** 28 Nov 2026. Oracle changes its sign-up screens often; if a screen differs, follow the intent of the step.
> **Cost:** $0. Only "Always Free" resources are used, and a $1 budget alert warns us if anything ever costs money.
> **Never paste passwords, card numbers or keys into a chat.** Keys go straight into files or Vercel; Claude shows how.

---

## Before you start (10 minutes)

| You need | Notes |
|---|---|
| **An email address the team will always keep** | It becomes the account's main login and receives the bills and alerts. Use one you won't lose access to |
| **A mobile phone** | For the SMS code, and for the sign-in app (step 3) |
| **A Visa or Mastercard credit card, or a debit card that works like a credit card** | **Not accepted:** prepaid cards, virtual or single-use cards, and PIN-only debit cards. Ugandan bank cards often block foreign online payments: **ask your bank to enable international online transactions** first |
| **A billing address** that matches the card | Same name as on the card |
| **A computer with a normal connection** | **Turn off any VPN.** Oracle rejects sign-ups that hide their location |
| **A password manager**, or a safe place for the password | |

## Step 1 · Sign up (15–30 minutes)

1. Go to **https://www.oracle.com/cloud/free/** and click **Start for free**.
2. **Country:** Uganda. Enter your **name** (as on the card) and the **email**, then open the verification email and click its link.
3. **Password**, then **Customer type**:
   - **Individual** if BEMERICK EXPRESS is not yet a registered company;
   - **Company** (with the registered name) if it is.
4. **Cloud account name** (also called the "tenancy"):
   - Suggested: **`bxnews`**. It is **permanent**, and you type it every time you sign in.
5. **Home region:** choose **South Africa Central (Johannesburg)**.
   - ⚠️ **It can never be changed**, and free servers only run in the home region.
   - Measured from this office on 28 Nov 2026: Johannesburg **~100 ms**, London/Milan ~170 ms, Frankfurt/Marseille ~195 ms, Dubai ~300 ms.
6. **Address and phone:** enter the address, then the SMS code sent to your phone.
7. **Payment verification:** add the card.
   - Oracle places a **small temporary hold** (about US$1 or the local equivalent) and releases it.
   - **You are not charged.**
8. Accept the agreement and click **Start my free trial**.
9. Wait for the **"Your Oracle Cloud account is ready"** email. This takes minutes, sometimes a few hours.

**What you get:**
- **A 30-day trial** with US$300 of credit (we won't use it).
- **Always Free resources** that never expire: a server of up to **2 cores and 12 GB memory** (Ampere A1), 200 GB of disk, and 10 TB of outgoing data a month.

## Step 2 · First sign-in

1. Sign in at **https://cloud.oracle.com** with the cloud account name (`bxnews`), then your email and password.
2. Check the region shown at the top right: it should say **South Africa Central (Johannesburg)**.

## Step 3 · Turn on two-step sign-in (MFA)

Oracle asks for this at the first sign-in.
1. Install an authenticator app on your phone: **Oracle Mobile Authenticator**, Google Authenticator or Microsoft Authenticator.
2. Scan the QR code and enter the 6-digit code.
3. **Save the backup or recovery codes** in the password manager. Losing the phone without them can lock you out.

## Step 4 · Upgrade to Pay-As-You-Go (recommended)

**Why:**
- Free accounts' servers can be **reclaimed when they look idle**, and a studio used a few hours a week looks idle.
- Pay-As-You-Go accounts keep the **same Always Free resources at no cost**. Users report they are not reclaimed, and free servers are easier to get when Oracle is busy.

**How:**
1. Menu ☰ → **Billing & Cost Management** → **Upgrade and Manage Payment**.
2. Choose **Upgrade to Pay As You Go** and confirm the card. Another small hold may appear and is released.
3. The upgrade can take up to a day. You get an email when it is done.

## Step 5 · Safety net: a $1 budget alert (5 minutes)

So that we know the same day if anything ever starts to cost money:
1. Menu ☰ → **Billing & Cost Management** → **Budgets** → **Create Budget**.
2. **Name:** `bx-zero-cost`.
   - **Target:** the root compartment (`bxnews`).
   - **Schedule:** monthly.
   - **Amount:** **1** (USD).
3. **Alert rule:**
   - **Threshold type:** Actual spend. **Threshold:** 1% (one cent).
   - **Email:** jjemba84@gmail.com (the alerts inbox).
4. Click **Create**.

## Step 6 · Stop here: the server is created together on S0 day

On day one of the spike, Claude creates the server with you, in about 30 minutes:
- **Machine:**
  - Compute → Instances → Create.
  - **Ubuntu 24.04 (aarch64)**; shape **VM.Standard.A1.Flex**, **2 OCPU / 12 GB** (labelled *Always Free-eligible*).
  - Public IP address; boot disk up to 100 GB.
- **SSH key:** generated on this computer during S0. The private key never leaves it.
- **Firewall:** only the ports LiveKit needs (HTTPS 443, WebRTC, SSH from known addresses).
- **If Oracle says "Out of host capacity":** there are no free A1 machines in Johannesburg at that moment.
  - Retry later (early morning often works).
  - Pay-As-You-Go accounts are served first.

## Other things for S0 day

| What | Who | Notes |
|---|---|---|
| Answers to §11 of `06-live-studio-plan.md` | Owner | Approve the change from "YouTube only" (D-003), who hosts, how long to keep recordings, audio first |
| A free **DuckDNS** name (e.g. `bxstudio.duckdns.org`) | Done together | Temporary server address until the domain is bought; sign in at duckdns.org with Google or GitHub |
| **Cloudflare R2** bucket `bx-live` + an access key | Done together | Uses the existing Cloudflare account (photos, backups) |
| A **mid-range Android phone** on **MTN or Airtel** data | Owner | To test what readers hear |
| **A second person** as the guest | Owner | Ideally on a different network or in another place |
| Wired headphones for both | Owner | Prevents echo; USB microphones can come later |

## If something goes wrong

| Problem | What to do |
|---|---|
| **Card declined / "payment verification failed"** | Ask the bank to allow international online payments; make sure the name and address match the card; no VPN; try a different Visa or Mastercard credit card; wait 24 hours and retry (many people need several attempts) |
| "Error processing transaction" or "account creation failed" after paying | Do not start over many times. Wait a day, then use the chat on oracle.com/cloud/free or email Oracle support with the email you used |
| Verification email didn't come | Check spam; request it again after 10 minutes |
| Lost the authenticator phone | Use the saved recovery codes; otherwise contact Oracle support from the sign-in page |
| Unexpected charge or budget email | Don't panic: tell Claude. Find the resource under Billing → Cost Analysis and stop it |

## Records

- Account name (tenancy) and home region are recorded here once created: **tenancy:** _(to fill in)_ · **home region:** _(to fill in)_ · **created:** _(date)_ · **Pay-As-You-Go:** _(yes/no, date)_
- Never write passwords, card details or keys in this file.
