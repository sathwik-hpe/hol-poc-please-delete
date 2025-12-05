# Hands-On Lab: Getting Started with HPE SilverCreek
## Support Bundle Generation and Backup Creation

---

## Lab Overview

Welcome! In this hands-on lab, you'll learn how to use two critical features of HPE SilverCreek:
- **Support Bundle Generation**: Collect diagnostic logs for troubleshooting
- **Backup Creation**: Protect your cluster data with automated backups

**Estimated Time**: 30 minutes

---

## Learning Objectives

By the end of this lab, you will be able to:
1. Access the HPE SilverCreek web interface
2. Generate a support bundle for diagnostics
3. Create a backup of your cluster
4. Verify backup completion and status
5. Understand when to use these features

---

## Prerequisites

Before starting this lab, ensure you have:

- ✅ Web browser (Chrome, Firefox, or Safari recommended)
- ✅ Access to HPE SilverCreek cluster URL (FQDN)
- ✅ Valid login credentials (username and password)
- ✅ Network connectivity to the cluster
- ✅ Basic understanding of web interfaces (no technical expertise required)

**No command-line or technical skills required!**

---

## Lab Environment

You'll be working with a live HPE SilverCreek cluster. The lab uses a real environment, so the actions you perform will actually generate support bundles and backups.

**Important**: This is a safe learning environment. Feel free to explore the interface.

---

## Exercise 1: Access HPE SilverCreek Interface

### Step 1: Open Your Web Browser

1. Launch your preferred web browser
2. Clear any cached data (optional but recommended)

### Step 2: Navigate to SilverCreek

1. In the address bar, enter the FQDN provided to you:
   ```
   https://your-silvercreek-cluster.example.com
   ```
   
   **Note**: Replace with your actual cluster URL

2. Press **Enter**

3. If you see a security warning about SSL certificates:
   - Click **Advanced**
   - Click **Proceed to site** (or similar option)
   
   ℹ️ This is normal for internal/test clusters

### Step 3: Log In

You should see the HPE SilverCreek login page.

1. Enter your **Username**: `[provided by instructor]`
2. Enter your **Password**: `[provided by instructor]`
3. Click **Sign In**

✅ **Checkpoint**: You should now see the HPE SilverCreek dashboard with navigation menu on the left side

**Screenshot Location**: After login, you'll see the main dashboard with tiles showing cluster health, resources, and status.

---

### Troubleshooting Exercise 1

| Problem | Solution |
|---------|----------|
| Cannot reach the URL | Verify you're on the correct network/VPN |
| Invalid credentials | Double-check username and password (case-sensitive) |
| Browser shows error | Try a different browser or clear cache |
| Page loads slowly | Wait 30 seconds - cluster may be initializing |

---

## Exercise 2: Generate a Support Bundle

Support bundles collect diagnostic information from your cluster. They're essential when you need to troubleshoot issues or work with HPE support.

### Step 1: Navigate to Support Bundle Section

1. Look at the left navigation menu
2. Find and click on **"Support"** or **"Diagnostics"** section
3. Click on **"Support Bundles"** or **"Support Logs"**

You should see a page showing existing support bundles (if any).

### Step 2: Create a New Support Bundle

1. Look for a button labeled **"Generate Support Bundle"** or **"Create New Bundle"**
2. Click this button

A dialog or form will appear.

### Step 3: Configure the Support Bundle

Fill in the following information:

1. **Bundle Name** (optional): Enter a descriptive name
   ```
   Example: "my-first-bundle-Dec2025"
   ```

2. **Time Range** (if shown): 
   - Select **"Last 24 hours"** or leave as default

3. **Components** (if shown):
   - Leave all checkboxes selected (collect all logs)

4. **Description** (optional):
   ```
   Example: "Test bundle for HOL exercise"
   ```

### Step 4: Start Bundle Generation

1. Click **"Generate"** or **"Create Bundle"** button
2. You should see a progress indicator

**What's happening?**: The system is now collecting logs from all cluster components. This typically takes 2-5 minutes.

### Step 5: Monitor Progress

You'll see the bundle status:
- **In Progress**: Still collecting logs (wait)
- **Completed**: Ready to download
- **Failed**: Something went wrong (see troubleshooting)

✅ **Checkpoint**: Wait until status shows **"Completed"** (approximately 2-5 minutes)

### Step 6: Verify Bundle Creation

Once completed, you should see:
- Bundle name
- Creation timestamp
- File size (typically 50-500 MB)
- Status: Completed
- Download option (optional: click to download)

✅ **Success Criteria**: 
- Status shows "Completed"
- Timestamp matches current time
- File size is greater than 0

---

### Troubleshooting Exercise 2

| Problem | Solution |
|---------|----------|
| Can't find Support Bundles menu | Look for "Support", "Diagnostics", or "Logs" in navigation |
| Bundle stays "In Progress" for >10 min | Refresh the page; contact administrator if still stuck |
| Bundle shows "Failed" | Note the error message; this may indicate cluster issues |
| Download fails | Check browser download settings; try different browser |

---

### 🎯 Knowledge Check

**Question**: When would you generate a support bundle?

<details>
<summary>Click to reveal answer</summary>

You should generate a support bundle when:
- Troubleshooting cluster issues
- Before contacting HPE support
- After making configuration changes
- Experiencing performance problems
- Documenting cluster state for auditing
</details>

---

## Exercise 3: Create a Backup

Backups protect your cluster data and configuration. You can restore from backups in case of failures or data loss.

### Step 1: Navigate to Backup Section

1. In the left navigation menu, find **"Backup & Restore"** or **"Data Protection"**
2. Click on **"Backups"**

You should see a page showing existing backups (if any) with:
- Backup names
- Creation dates
- Status
- Size

### Step 2: Initiate Backup Creation

1. Look for a button labeled **"Create Backup"** or **"New Backup"**
2. Click this button

A backup configuration dialog will appear.

### Step 3: Configure the Backup

Fill in the backup details:

1. **Backup Name**: Enter a descriptive name
   ```
   Example: "hol-backup-2025-12-04"
   ```
   
   💡 **Tip**: Use names that indicate date or purpose

2. **Backup Type** (if shown):
   - Select **"Full Backup"** (recommended for this lab)

3. **Description** (optional):
   ```
   Example: "First backup created during HOL"
   ```

4. **Retention Policy** (if shown):
   - Leave as default or select **"Keep for 7 days"**

### Step 4: Review Backup Scope

The backup will include:
- All namespaces and applications
- Persistent volumes and data
- Cluster configurations
- Custom resources

💡 **Good to Know**: A full backup of 900+ services typically takes 5-15 minutes

### Step 5: Start the Backup

1. Review your settings
2. Click **"Create Backup"** or **"Start Backup"** button
3. You should see a confirmation message

### Step 6: Monitor Backup Progress

You'll be redirected to the backup list. Find your new backup:

**Status Progression**:
1. **In Progress** → Backup is running (current)
2. **Completed** → Backup finished successfully
3. **Failed** → Backup encountered errors

**What to watch**:
- Progress percentage (if shown)
- Current phase (e.g., "Backing up volumes", "Finalizing")
- Estimated time remaining

✅ **Checkpoint**: Wait until status shows **"Completed"** (approximately 5-15 minutes)

**Note**: While waiting, you can proceed to review the information below. The backup will continue in the background.

### Step 7: Verify Backup Completion

Once completed, verify the backup shows:
- ✅ Status: **Completed**
- ✅ Completion timestamp
- ✅ Backup size (typically several GB)
- ✅ Success rate: **99%+** (some transient resources may not backup)
- ✅ Warnings or errors: **0 or minimal**

Click on the backup name to see detailed information:
- Number of resources backed up
- Persistent volumes included
- Warnings (if any)
- Backup location/storage details

✅ **Success Criteria**:
- Status is "Completed"
- Success rate is 99% or higher
- No critical errors
- Backup size is reasonable (multiple GB for full cluster)

---

### Troubleshooting Exercise 3

| Problem | Solution |
|---------|----------|
| Can't find Backup menu | Look for "Backup & Restore" or "Data Protection" |
| Backup stuck at 0% | Wait 2-3 minutes; backups take time to initialize |
| Backup fails immediately | Check cluster health; verify storage is available |
| Success rate below 95% | Check warnings tab; some failures are normal for transient resources |
| Backup takes >30 minutes | Normal for large clusters; be patient |

---

### 🎯 Knowledge Check

**Question**: What's the difference between a support bundle and a backup?

<details>
<summary>Click to reveal answer</summary>

**Support Bundle**:
- Contains diagnostic logs and system information
- Used for troubleshooting and debugging
- Helps HPE support diagnose issues
- Small size (MB)
- Quick to generate (minutes)

**Backup**:
- Contains actual application data and configurations
- Used for disaster recovery and data restoration
- Protects against data loss
- Large size (GB)
- Takes longer to create (15+ minutes)
</details>

---

## Exercise 4: Understanding Your Results

### Review What You've Accomplished

Congratulations! You've successfully:
1. ✅ Logged into HPE SilverCreek
2. ✅ Generated a support bundle for diagnostics
3. ✅ Created a full cluster backup

### Understanding the Value

**Support Bundles**:
- Essential for troubleshooting
- First thing HPE support will request
- Can be generated on-demand
- No impact on running applications

**Backups**:
- Critical for business continuity
- Enable disaster recovery
- Can restore entire cluster in ~10 minutes
- Should be scheduled regularly (daily/weekly)

### Best Practices

**For Support Bundles**:
- Generate before making major changes
- Create when experiencing issues
- Keep recent bundles for comparison
- Include in incident tickets

**For Backups**:
- Schedule automatic daily backups
- Test restores periodically
- Keep multiple backup versions
- Document backup schedule

---

## Challenge Exercises (Optional)

Want to practice more? Try these additional tasks:

### Challenge 1: Schedule Automatic Backups
1. Navigate to Backup settings
2. Look for "Backup Schedule" or "Policy"
3. Try configuring a daily backup at 2:00 AM

### Challenge 2: Download and Inspect Support Bundle
1. Download the support bundle you created
2. Extract the archive
3. Browse the log files to see what's included

### Challenge 3: Explore Backup Details
1. Click on your completed backup
2. Explore the different tabs (Resources, Volumes, Warnings)
3. Understand what was backed up

---

## Lab Summary

### What You Learned

In this lab, you successfully:
- Accessed HPE SilverCreek web interface
- Generated diagnostic support bundles
- Created full cluster backups
- Verified backup completion and status
- Understood when to use each feature

### Key Takeaways

1. **Support bundles** are your first step in troubleshooting
2. **Backups** are your safety net for disaster recovery
3. Both operations are **simple and user-friendly**
4. Regular backups are **critical for production environments**
5. HPE SilverCreek makes data protection **easy and reliable**

### Real-World Scenarios

**Scenario 1**: Application Issues
- Generate support bundle
- Share with support team
- Analyze logs for root cause

**Scenario 2**: Infrastructure Failure
- Restore from latest backup
- System back online in ~10 minutes
- Zero data loss

**Scenario 3**: Before Major Upgrade
- Create pre-upgrade backup
- Proceed with upgrade safely
- Rollback option available if needed

---

## Cleanup (Optional)

If this is a test environment and you want to clean up:

### Delete Test Support Bundle
1. Go to Support Bundles page
2. Select the bundle you created
3. Click "Delete" (if available)

### Keep or Delete Test Backup
- **Keep it**: Backups don't harm anything
- **Delete it**: Only if storage is limited
  1. Go to Backups page
  2. Select your backup
  3. Click "Delete"

**Note**: In production, never delete backups without proper retention policy!

---

## Next Steps

### Continue Learning
- **Lab 2**: Restore from Backup (coming soon)
- **Lab 3**: Advanced Backup Scheduling
- **Lab 4**: Analyzing Support Bundles

### Documentation
- Read the [Backup User Guide](http://silvercreek.hstlabs.glcp.hpecorp.net/latest/sc/guides/backup/)
- Explore [Support Logs Documentation](http://silvercreek.hstlabs.glcp.hpecorp.net/latest/sc/guides/ui-logs/)
- Watch [Video Demos](http://silvercreek.hstlabs.glcp.hpecorp.net/latest/sc/demo/)

### Production Recommendations
1. Schedule daily backups
2. Test restores monthly
3. Keep 30 days of backups
4. Document your backup strategy
5. Train your team on these procedures

---

## Feedback

We'd love to hear from you! Please provide feedback on:
- Was the lab clear and easy to follow?
- Did you encounter any issues?
- What would you like to learn next?
- How can we improve this lab?

---

## Appendix A: Quick Reference

### Common Actions

| Task | Location | Button/Action |
|------|----------|---------------|
| Generate Support Bundle | Support > Support Bundles | "Generate Bundle" |
| Create Backup | Backup & Restore > Backups | "Create Backup" |
| View Backup Details | Click backup name | View tabs |
| Download Support Bundle | Bundle list | Download icon |

### Typical Timings

| Operation | Expected Duration |
|-----------|-------------------|
| Support Bundle Generation | 2-5 minutes |
| Full Cluster Backup | 5-15 minutes |
| Backup Restore | ~10 minutes |
| Login/Navigation | Instant |

### Success Indicators

| Feature | Success Looks Like |
|---------|-------------------|
| Support Bundle | Status: Completed, Size > 0 |
| Backup | Status: Completed, Success Rate 99%+ |
| Login | Dashboard visible, Menu accessible |

---

## Appendix B: Glossary

**Support Bundle**: A compressed archive containing diagnostic logs and system information

**Backup**: A complete snapshot of cluster data, configurations, and applications

**FQDN**: Fully Qualified Domain Name (e.g., cluster.example.com)

**Persistent Volume**: Storage that persists beyond pod lifecycle

**Namespace**: Kubernetes logical grouping for resources

**Velero**: Open-source backup tool used by HPE SilverCreek

**Restore**: Process of recovering data from a backup

---

## Support & Contact

If you need assistance:
- Contact your HPE support team
- Reference this lab document
- Include support bundle if reporting issues
- Provide backup details for data recovery requests

---

**Lab Version**: 1.0  
**Last Updated**: December 4, 2025  
**Author**: HPE SilverCreek Team  
**Estimated Completion Time**: 30 minutes

---

## Lab Completion Certificate

🎉 **Congratulations!**

You have successfully completed the "Getting Started with HPE SilverCreek" hands-on lab.

**Skills Acquired**:
- ✅ HPE SilverCreek Interface Navigation
- ✅ Support Bundle Generation
- ✅ Backup Creation and Verification
- ✅ Data Protection Best Practices

**Date Completed**: _____________  
**Your Name**: _____________

Keep learning and exploring HPE SilverCreek!
