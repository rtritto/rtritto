import { createSignal, onCleanup, onMount, Switch, Match } from 'solid-js'

type FormStatus = 'idle' | 'success' | 'error' | 'rate_limited' | 'captcha_error'

export default function Page() {
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [formStatus, setFormStatus] = createSignal<FormStatus>('idle')
  const [turnstileToken, setTurnstileToken] = createSignal('')
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [message, setMessage] = createSignal('')

  let turnstileContainer!: HTMLDivElement
  let turnstileWidgetId: string | undefined

  const isNameValid = () => name().trim().length >= 2
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email().trim()) && email().trim().length <= 254
  }
  const isMessageValid = () => message().trim().length >= 10 && message().trim().length <= 5000
  const isFormValid = () => isNameValid() && isEmailValid() && isMessageValid() && !!turnstileToken()

  const resetTurnstile = () => {
    setTurnstileToken('')
    const turnstile = (globalThis as any).turnstile
    if (turnstile && turnstileWidgetId) turnstile.reset(turnstileWidgetId)
  }

  onMount(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

    if (!siteKey) {
      console.error('Missing VITE_TURNSTILE_SITE_KEY')
      return
    }

    const renderTurnstile = () => {
      const turnstile = (globalThis as any).turnstile

      if (!turnstile || !turnstileContainer || turnstileWidgetId) return

      turnstileWidgetId = turnstile.render(turnstileContainer, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (token: string) => { setTurnstileToken(token) },
        'expired-callback': () => { setTurnstileToken('') },
        'error-callback': () => { setTurnstileToken('') }
      })
    }

    if ((globalThis as any).turnstile) {
      renderTurnstile()
      return
    }

    const existingScript = document.querySelector('#cf-turnstile-script')

    if (existingScript) {
      existingScript.addEventListener('load', renderTurnstile, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'cf-turnstile-script'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.addEventListener('load', renderTurnstile, { once: true })

    document.head.append(script)
  })

  onCleanup(() => {
    const turnstile = (globalThis as any).turnstile
    if (turnstile && turnstileWidgetId) turnstile.remove(turnstileWidgetId)
  })

  const handleContact = async (e: SubmitEvent) => {
    e.preventDefault()

    if (isSubmitting() || !isFormValid()) return

    setIsSubmitting(true)
    setFormStatus('idle')

    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const payload = {
      ...Object.fromEntries(formData),
      turnstileToken: turnstileToken()
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setFormStatus('success')
        form.reset()
        setName('')
        setEmail('')
        setMessage('')
      } else if (res.status === 429) setFormStatus('rate_limited')
      else if (res.status === 403) setFormStatus('captcha_error')
      else setFormStatus('error')
    } catch {
      setFormStatus('error')
    } finally {
      setIsSubmitting(false)
      resetTurnstile()
    }
  }

  return (
    <div class="bg-base-200 font-sans text-base-content">
      {/* BACKGROUND */}
      <div class="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.20),transparent_35%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.12),transparent_30%)]" />

      <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="https://github.com/rtritto"
          target="_blank"
          rel="noopener noreferrer"
          class="btn gap-2 shadow-lg shadow-neutral/20 btn-neutral btn-lg"
          aria-label="Open GitHub profile"
        >
          <svg
            xmlns="https://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub Profile
        </a>
      </div>

      {/* CONTACT FORM */}
      <section id="contact-me" class="container mx-auto max-w-2xl scroll-mt-10 px-4 py-8">
        <div class="mb-6 flex justify-center">
          <div class="badge badge-outline badge-lg badge-primary">
            Available for collaboration
          </div>
        </div>
        <div class="mb-8 text-center">
          <p class="text-sm font-semibold tracking-[0.25em] text-accent uppercase">Contact Me</p>
          <p class="mt-3 text-base-content/65">
            Send me a message securely through the contact form.
          </p>
        </div>

        <div class="card border border-base-300 bg-base-100/95 shadow-2xl shadow-primary/10 backdrop-blur">
          <div class="card-body">
            <form onSubmit={handleContact} class="space-y-5" aria-busy={isSubmitting()}>
              <div class="form-control">
                <label class="label" for="name">
                  <span class="label-text font-medium">Name + Surname</span>
                  <span class="label-text-alt text-base-content/50">
                    {name().trim().length > 0 && !isNameValid() ? 'Min 2 characters' : ''}
                  </span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autocomplete="name"
                  placeholder="John Doe"
                  class="input input-bordered w-full focus:input-primary"
                  classList={{
                    'input-error': name().trim().length > 0 && !isNameValid(),
                    'input-success': isNameValid()
                  }}
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                />
              </div>

              <div class="form-control">
                <label class="label" for="email">
                  <span class="label-text font-medium">Email</span>
                  <span class="label-text-alt text-base-content/50">
                    {email().trim().length > 0 && !isEmailValid() ? 'Invalid email' : ''}
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  maxLength={254}
                  autocomplete="email"
                  placeholder="john@example.com"
                  class="input input-bordered w-full focus:input-primary"
                  classList={{
                    'input-error': email().trim().length > 0 && !isEmailValid(),
                    'input-success': isEmailValid()
                  }}
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                />
              </div>

              <div class="form-control">
                <label class="label" for="message">
                  <span class="label-text font-medium">Message</span>
                  <span class="label-text-alt text-base-content/50">
                    {message().trim().length > 0 && !isMessageValid()
                      ? `Min 10 characters (${message().trim().length}/10)`
                      : (message().trim().length >= 10 ? `${message().trim().length}/5000` : '')}
                  </span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  class="textarea textarea-bordered min-h-32 w-full focus:textarea-primary"
                  classList={{
                    'textarea-error': message().trim().length > 0 && !isMessageValid(),
                    'textarea-success': isMessageValid()
                  }}
                  placeholder="How can I help you?"
                  value={message()}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                />
              </div>

              {/* Honeypot anti-spam */}
              <div class="absolute -left-[9999px]" aria-hidden="true">
                <label for="website">Website</label>
                <input
                  id="website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autocomplete="off"
                />
              </div>

              <div class="form-control mb-4">
                <div class="flex justify-center">
                  <div ref={turnstileContainer} />
                </div>
              </div>

              <button
                type="submit"
                class="btn btn-primary w-full shadow-lg shadow-primary/20"
                disabled={isSubmitting() || !isFormValid()}
              >
                {isSubmitting() ? (
                  <>
                    <span class="loading loading-spinner" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>

              <Switch>
                <Match when={formStatus() === 'success'}>
                  <div role="alert" class="mt-4 alert alert-success">
                    <span>Message sent, thanks!</span>
                  </div>
                </Match>
                <Match when={formStatus() === 'captcha_error'}>
                  <div role="alert" class="mt-4 alert alert-warning">
                    <span>Captcha verification failed. Please try again.</span>
                  </div>
                </Match>
                <Match when={formStatus() === 'rate_limited'}>
                  <div role="alert" class="mt-4 alert alert-warning">
                    <span>Too many requests. Please try again later.</span>
                  </div>
                </Match>
                <Match when={formStatus() === 'error'}>
                  <div role="alert" class="mt-4 alert alert-error">
                    <span>Failed to send. Try again later.</span>
                  </div>
                </Match>
              </Switch>
            </form>
          </div>
        </div>
      </section>

      <footer class="border-t border-base-300 bg-base-100/80 py-8 text-center text-sm text-base-content/50">
        <p>Built with Vike Lite, SolidJS, TailwindCSS, DaisyUI and Hono.</p>
      </footer>
    </div>
  )
}
