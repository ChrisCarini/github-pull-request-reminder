

async function run() {
  reviewerLogins = ''
  let reviewer_mention = ''
  for (const login of reviewerLogins.split(', ')) {
    if (login !== '') {
      reviewer_mention += `@${login}, `
    }
  }
  const comment = `Hi ${reviewer_mention}
  
Test opened this PR X business hours ago, and the P50 code review latency for this MP is Y business hours. If you are able, review this code now to help reduce this multiproduct's Code Review Latency!

Beep Boop Beep,
GitHub PR Reminder Bot`
  console.log(comment)
}

run()