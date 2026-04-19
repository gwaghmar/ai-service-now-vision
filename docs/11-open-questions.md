# Open Questions

These remain open questions needing resolution to tighten development phases:

1. **Which exact 10 applications do we focus on writing schemas and SCIM/API connector logic for first?** 
   *(Recommendation: Google Workspace, GitHub, Slack, AWS, OpenAI, linear...)*

2. **How far are we building the internal policy rules engine from scratch versus leaning heavily on Group mappings inherited directly from Okta/Google?**

3. **Because we are not doing MDM device deployment (Kandji/Jamf), how are we factoring end-client software installations?** 
   *(Do we just say "Download the Slack desktop app" inside our Knowledge base view or simply assume it's pre-installed?)*

4. **Will we establish an internal polling cron system for validation checking or rely heavily on third party vendor web-hooks?** 
   *(Webhooks frequently fail; recurrent polling guarantees our drift-detection accuracy).*

5. **Should the V1 User Interface reflect a conversational "Chat/Agent" flow like Slack applications, or a standard web-form dashboard approach?**
