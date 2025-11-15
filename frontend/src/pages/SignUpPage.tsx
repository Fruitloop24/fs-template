import { SignUp } from '@clerk/clerk-react'

export default function SignUpPage() {
  // After signup, always redirect to choose-plan page
  // User can select their tier from there
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/choose-plan"
      />
    </div>
  )
}
