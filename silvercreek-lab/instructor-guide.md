# Instructor Guide: Getting Started HOL

## Overview
This guide helps instructors facilitate the "Getting Started with HPE SilverCreek" hands-on lab.

---

## Pre-Lab Setup

### Environment Requirements
- ✅ Working HPE SilverCreek cluster
- ✅ User accounts created for participants
- ✅ Network access configured
- ✅ Backup storage available

### Test Before Lab
1. Log in with test credentials
2. Generate a test support bundle (verify 2-5 min completion)
3. Create a test backup (verify 5-15 min completion)
4. Verify UI is responsive

### Participant Information to Provide
```
Cluster URL: https://your-cluster.example.com
Username: [assign unique usernames]
Password: [provide passwords securely]
Estimated Time: 30 minutes
```

---

## Lab Timeline

| Time | Activity | Duration |
|------|----------|----------|
| 0:00 | Introduction & Overview | 5 min |
| 0:05 | Exercise 1: Login | 5 min |
| 0:10 | Exercise 2: Support Bundle | 10 min |
| 0:20 | Exercise 3: Backup Creation | 15 min |
| 0:35 | Q&A and Wrap-up | 10 min |
| 0:45 | Buffer time | 15 min |

**Total**: 45-60 minutes including Q&A

---

## Common Issues & Solutions

### Login Issues
**Issue**: Cannot access URL  
**Solution**: Verify VPN/network, check firewall rules

**Issue**: Invalid credentials  
**Solution**: Reset password, verify username spelling

### Support Bundle Issues
**Issue**: Stuck in progress  
**Solution**: Check cluster health, wait up to 10 minutes before investigating

**Issue**: Bundle fails  
**Solution**: Review cluster logs, may indicate cluster issues

### Backup Issues
**Issue**: Backup takes very long  
**Solution**: Normal for first backup, explain expected times

**Issue**: Success rate below 95%  
**Solution**: Explain transient resources, show warnings tab

---

## Teaching Tips

1. **Start with a demo**: Show the entire process once before letting participants try
2. **Use screen sharing**: Project your screen to guide participants
3. **Set expectations**: Explain that backups take time (5-15 minutes)
4. **Encourage exploration**: The UI is safe to explore
5. **Have backup plan**: Prepare demo screenshots if live system has issues

---

## Discussion Points

### During Support Bundle Exercise
- Explain what logs are collected
- Discuss when to generate bundles
- Show how HPE support uses bundles

### During Backup Exercise
- Discuss backup strategies (daily, weekly)
- Explain restoration process (will be in Lab 2)
- Compare to VMware snapshots (10 min vs 1.5 hours)

---

## Answer Key

### Knowledge Check 1
**Q**: When would you generate a support bundle?  
**A**: When troubleshooting, before contacting support, after config changes, performance issues, documenting state

### Knowledge Check 2
**Q**: What's the difference between support bundle and backup?  
**A**: Support bundle = diagnostic logs (MB, minutes), Backup = data protection (GB, 15+ min)

---

## Post-Lab Follow-up

1. Collect participant feedback
2. Note any issues encountered
3. Update lab guide if needed
4. Provide additional resources
5. Schedule Lab 2: Restore from Backup

---

## Additional Resources for Participants

- Video Demo: [Support Logs UI](http://silvercreek.hstlabs.glcp.hpecorp.net/latest/sc/demo/support-logs-ui/)
- User Guide: [Backup Guide](http://silvercreek.hstlabs.glcp.hpecorp.net/latest/sc/guides/backup/)
- Support: Contact HPE support team

---

**Last Updated**: December 4, 2025
