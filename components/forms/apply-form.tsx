"use client"

import * as React from "react"
import Link from "next/link"
import { IconAtom, IconUpload, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type ReturningValue = "" | "yes" | "no"
type PartnerPreference = "MANDATORY" | "RECOMMENDED" | "NA"

type EventChoice = {
    eventName: string
    partnerNames: string
    partnerPreference: PartnerPreference
}

type FieldErrors = Record<string, string>

type ApplicationForm = {
    joinCode: string
    name: string
    gradeLevel: string
    email: string
    phone: string
    shirtSize: string
    isReturning: ReturningValue
    whyJoin: string
    contributionIdeas: string
    topEvents: EventChoice[]
    awards: string
    previousEvents: string
    scienceClasses: string
    mathClasses: string
    questions: string
}

type EventOption = {
    id: string
    name: string
    code: string | null
    isTrialEvent: boolean
    sortOrder: number | null
}

type EventsResponse = {
    season: {
        id: string
        name: string
        schoolYear: string
    } | null
    events: EventOption[]
    error?: string
}

const GRADE_LEVELS = ["9", "10", "11", "12"] as const
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL"] as const

const DUPLICATE_TOP_EVENTS_ERROR = "All 6 event choices must be different."
const DUPLICATE_EVENT_ERROR = "This event is already selected in another choice."
const GENERIC_FIX_ERROR = "Please fix the highlighted fields."

const textareaClassName =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

const selectClassName =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

function createEmptyTopEvents(): EventChoice[] {
    return Array.from({ length: 6 }, () => ({
        eventName: "",
        partnerNames: "",
        partnerPreference: "NA" as PartnerPreference,
    }))
}

function createInitialForm(): ApplicationForm {
    return {
        joinCode: "",
        name: "",
        gradeLevel: "",
        email: "",
        phone: "",
        shirtSize: "",
        isReturning: "",
        whyJoin: "",
        contributionIdeas: "",
        topEvents: createEmptyTopEvents(),
        awards: "",
        previousEvents: "",
        scienceClasses: "",
        mathClasses: "",
        questions: "",
    }
}

function getPhoneDigits(value: string) {
    return value.replace(/\D/g, "").slice(0, 10)
}

function formatPhoneNumber(value: string) {
    const digits = getPhoneDigits(value)

    if (digits.length <= 3) return digits
    if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function normalizeTopEvents(events: EventChoice[]) {
    return events.map((event) => ({
        ...event,
        eventName: event.eventName.trim(),
        partnerNames: event.partnerNames.trim(),
    }))
}

function getDuplicateEventErrors(events: EventChoice[]): FieldErrors {
    const grouped = new Map<string, number[]>()

    events.forEach((event, index) => {
        const normalized = event.eventName.trim().toLowerCase()
        if (!normalized) return

        const current = grouped.get(normalized) ?? []
        current.push(index)
        grouped.set(normalized, current)
    })

    const errors: FieldErrors = {}

    for (const indexes of grouped.values()) {
        if (indexes.length > 1) {
            errors.topEvents = DUPLICATE_TOP_EVENTS_ERROR
            indexes.forEach((index) => {
                errors[`topEvents.${index}.eventName`] = DUPLICATE_EVENT_ERROR
            })
        }
    }

    return errors
}

function validateStep1(form: ApplicationForm): FieldErrors {
    const errors: FieldErrors = {}

    if (!form.joinCode.trim()) errors.joinCode = "Join code is required."

    if (!form.name.trim()) errors.name = "Full name is required."

    if (!form.gradeLevel.trim()) {
        errors.gradeLevel = "Grade level is required."
    } else if (
        !GRADE_LEVELS.includes(form.gradeLevel as (typeof GRADE_LEVELS)[number])
    ) {
        errors.gradeLevel = "Please select a valid grade level."
    }

    if (!form.email.trim()) {
        errors.email = "Email is required."
    }

    const phoneDigits = getPhoneDigits(form.phone)
    if (!form.phone.trim()) {
        errors.phone = "Phone number is required."
    } else if (phoneDigits.length !== 10) {
        errors.phone = "Phone number must be exactly 10 digits."
    }

    if (!form.shirtSize.trim()) {
        errors.shirtSize = "Shirt size is required."
    } else if (
        !SHIRT_SIZES.includes(form.shirtSize as (typeof SHIRT_SIZES)[number])
    ) {
        errors.shirtSize = "Please select a valid shirt size."
    }

    if (!form.isReturning) {
        errors.isReturning = "Please choose yes or no."
    }

    if (!form.whyJoin.trim()) {
        errors.whyJoin = "This question is required."
    }

    if (!form.contributionIdeas.trim()) {
        errors.contributionIdeas = "This question is required."
    }

    return errors
}

function validateStep2(
    form: ApplicationForm,
    focusPageFile: File | null,
    availableEventNames: Set<string> | null
): FieldErrors {
    const errors: FieldErrors = {}
    const cleanedEvents = normalizeTopEvents(form.topEvents)

    cleanedEvents.forEach((event, index) => {
        if (!event.eventName) {
            errors[`topEvents.${index}.eventName`] = "Event name is required."
        } else if (
            availableEventNames &&
            availableEventNames.size > 0 &&
            !availableEventNames.has(event.eventName)
        ) {
            errors[`topEvents.${index}.eventName`] = "Please select a valid event."
        }

        if (event.partnerPreference !== "NA" && !event.partnerNames) {
            errors[`topEvents.${index}.partnerNames`] =
                "Enter partner name(s) or choose N/A."
        }
    })

    Object.assign(errors, getDuplicateEventErrors(cleanedEvents))

    if (!form.awards.trim()) {
        errors.awards = "Please list your awards or write N/A."
    }

    if (!form.previousEvents.trim()) {
        errors.previousEvents = "Please list previous events or write N/A."
    }

    if (!focusPageFile) {
        errors.focusPageFile = "Please upload your Broward Focus page."
    }

    if (!form.scienceClasses.trim()) {
        errors.scienceClasses =
            "Please list science classes taken or currently taking."
    }

    if (!form.mathClasses.trim()) {
        errors.mathClasses =
            "Please list math classes taken or currently taking."
    }

    return errors
}

export function ApplyForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [step, setStep] = React.useState<1 | 2>(1)
    const [form, setForm] = React.useState<ApplicationForm>(createInitialForm)
    const [focusPageFile, setFocusPageFile] = React.useState<File | null>(null)

    const [eventOptions, setEventOptions] = React.useState<EventOption[]>([])
    const [eventsLoading, setEventsLoading] = React.useState(true)
    const [eventsError, setEventsError] = React.useState<string | null>(null)

    const [loading, setLoading] = React.useState(false)
    const [formError, setFormError] = React.useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

    const availableEventNames = React.useMemo(() => {
        if (eventOptions.length === 0) return null
        return new Set(eventOptions.map((event) => event.name))
    }, [eventOptions])

    const loadEvents = React.useCallback(async (joinCode?: string) => {
        setEventsLoading(true)
        setEventsError(null)

        try {
            const url = joinCode
                ? `/api/public/events?joinCode=${encodeURIComponent(joinCode)}`
                : "/api/public/events"

            const res = await fetch(url, { method: "GET", cache: "no-store" })
            const data: EventsResponse = await res.json()

            if (!res.ok) {
                throw new Error(data.error ?? "Failed to load events.")
            }

            setEventOptions(data.events ?? [])

            if (!data.events?.length) {
                setEventsError(
                    data.error ?? "No events are available for this join code."
                )
            }
        } catch (error) {
            console.error(error)
            setEventOptions([])
            setEventsError("Could not load event choices. Please try again.")
        } finally {
            setEventsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        void loadEvents()
    }, [loadEvents])

    // Re-fetch events when a complete join code is entered (on step 2 load)
    const joinCodeRef = React.useRef(form.joinCode)
    React.useEffect(() => {
        if (step === 2 && form.joinCode.trim() && form.joinCode !== joinCodeRef.current) {
            joinCodeRef.current = form.joinCode
            void loadEvents(form.joinCode.trim())
        }
    }, [step, form.joinCode, loadEvents])

    const isStep1Complete = React.useMemo(() => {
        return Object.keys(validateStep1(form)).length === 0
    }, [form])

    const isStep2Complete = React.useMemo(() => {
        return (
            Object.keys(validateStep2(form, focusPageFile, availableEventNames))
                .length === 0
        )
    }, [form, focusPageFile, availableEventNames])

    const hasEventOptions = eventOptions.length > 0

    const isReadyToSubmit =
        hasEventOptions &&
        !eventsLoading &&
        !eventsError &&
        isStep1Complete &&
        isStep2Complete

    function getFieldClass(name: string) {
        return cn(
            fieldErrors[name] &&
            "border-destructive focus-visible:ring-destructive/20"
        )
    }

    function getTextareaClass(name: string) {
        return cn(
            textareaClassName,
            fieldErrors[name] &&
            "border-destructive focus-visible:ring-destructive/20"
        )
    }

    function getLabelClass(name: string) {
        return cn(fieldErrors[name] && "text-destructive")
    }

    function clearFieldError(name: string) {
        setFieldErrors((prev) => {
            if (!prev[name]) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })
    }

    function syncDuplicateEventErrors(
        nextTopEvents: EventChoice[],
        changedEventIndex?: number
    ) {
        const duplicateErrors = getDuplicateEventErrors(nextTopEvents)

        const shouldToastDuplicate =
            changedEventIndex !== undefined &&
            duplicateErrors[`topEvents.${changedEventIndex}.eventName`] ===
            DUPLICATE_EVENT_ERROR

        setFieldErrors((prev) => {
            const next = { ...prev }

            if (next.topEvents === DUPLICATE_TOP_EVENTS_ERROR) {
                delete next.topEvents
            }

            nextTopEvents.forEach((_, index) => {
                const key = `topEvents.${index}.eventName`
                if (next[key] === DUPLICATE_EVENT_ERROR) {
                    delete next[key]
                }
            })

            return {
                ...next,
                ...duplicateErrors,
            }
        })

        if (shouldToastDuplicate) {
            setFormError(GENERIC_FIX_ERROR)
            toast.error(DUPLICATE_TOP_EVENTS_ERROR)
        } else if (!duplicateErrors.topEvents) {
            setFormError((prev) => (prev === GENERIC_FIX_ERROR ? null : prev))
        }
    }

    function updateEventChoice(
        index: number,
        key: keyof EventChoice,
        value: string
    ) {
        const nextTopEvents = form.topEvents.map((event, i) =>
            i === index
                ? ({
                    ...event,
                    [key]: value,
                } as EventChoice)
                : event
        )

        setForm((prev) => ({
            ...prev,
            topEvents: nextTopEvents,
        }))

        clearFieldError(`topEvents.${index}.${key}`)
        setFormError(null)

        if (key === "partnerPreference" && value === "NA") {
            clearFieldError(`topEvents.${index}.partnerNames`)
        }

        syncDuplicateEventErrors(
            nextTopEvents,
            key === "eventName" ? index : undefined
        )
    }

    function updateField(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value } = e.target
        const nextValue = name === "phone" ? formatPhoneNumber(value) : value

        setForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }))

        clearFieldError(name)
        setFormError(null)
    }

    function handleNextStep() {
        setFormError(null)

        const errors = validateStep1(form)

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            setFormError(GENERIC_FIX_ERROR)
            toast.error(GENERIC_FIX_ERROR)
            return
        }

        setFieldErrors({})
        setStep(2)
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setFormError(null)

        const step1Errors = validateStep1(form)
        if (Object.keys(step1Errors).length > 0) {
            setStep(1)
            setFieldErrors(step1Errors)
            setFormError(GENERIC_FIX_ERROR)
            toast.error(GENERIC_FIX_ERROR)
            return
        }

        const step2Errors = validateStep2(form, focusPageFile, availableEventNames)
        if (Object.keys(step2Errors).length > 0) {
            setFieldErrors(step2Errors)
            setFormError(GENERIC_FIX_ERROR)

            if (step2Errors.topEvents) {
                toast.error(DUPLICATE_TOP_EVENTS_ERROR)
            } else {
                toast.error(GENERIC_FIX_ERROR)
            }
            return
        }

        setLoading(true)
        setFieldErrors({})

        try {
            const payload = new FormData()

            payload.append("joinCode", form.joinCode.trim())
            payload.append("name", form.name.trim())
            payload.append("gradeLevel", form.gradeLevel)
            payload.append("email", form.email.trim())
            payload.append("phone", getPhoneDigits(form.phone))
            payload.append("shirtSize", form.shirtSize)
            payload.append("isReturning", String(form.isReturning === "yes"))

            payload.append("whyJoin", form.whyJoin.trim())
            payload.append("contributionIdeas", form.contributionIdeas.trim())

            payload.append(
                "topEvents",
                JSON.stringify(normalizeTopEvents(form.topEvents))
            )
            payload.append("awards", form.awards.trim())
            payload.append("previousEvents", form.previousEvents.trim())
            payload.append("scienceClasses", form.scienceClasses.trim())
            payload.append("mathClasses", form.mathClasses.trim())
            payload.append("questions", form.questions.trim())

            if (focusPageFile) {
                payload.append("focusPageFile", focusPageFile)
            }

            const res = await fetch("/api/public/apply", {
                method: "POST",
                credentials: "include",
                body: payload,
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                const message = data?.error ?? "Application failed."
                setFormError(message)
                toast.error(message)
                return
            }

            toast.success("Application submitted successfully.")
            setStep(1)
            setFocusPageFile(null)
            setFieldErrors({})
            setFormError(null)
            setForm(createInitialForm())
        } catch (err) {
            console.error(err)
            setFormError("Something went wrong. Please try again.")
            toast.error("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <form onSubmit={onSubmit} noValidate>
                <FieldGroup className="gap-6">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="flex size-8 items-center justify-center rounded-md">
                                <IconAtom className="size-7" />
                            </div>
                            <span className="sr-only">Science Olympiad</span>
                        </Link>

                        <h1 className="text-xl font-bold">Apply to Science Olympiad</h1>

                        <FieldDescription>Step {step} of 2</FieldDescription>

                        <FieldDescription>
                            Already have an account? <Link href="/login">Login</Link>
                        </FieldDescription>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div
                            className={cn(
                                "h-2 rounded-full transition-colors",
                                isStep1Complete ? "bg-primary" : "bg-muted"
                            )}
                        />
                        <div
                            className={cn(
                                "h-2 rounded-full transition-colors",
                                isReadyToSubmit ? "bg-primary" : "bg-muted"
                            )}
                        />
                    </div>

                    {formError ? (
                        <p className="text-sm text-destructive">{formError}</p>
                    ) : null}

                    {step === 1 ? (
                        <>
                            <Field>
                                <FieldLabel
                                    htmlFor="joinCode"
                                    className={getLabelClass("joinCode")}
                                >
                                    Club join code *
                                </FieldLabel>
                                <Input
                                    id="joinCode"
                                    name="joinCode"
                                    value={form.joinCode}
                                    onChange={updateField}
                                    placeholder="e.g. PPCHS2026"
                                    className={getFieldClass("joinCode")}
                                    autoComplete="off"
                                />
                                {fieldErrors.joinCode ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.joinCode}
                                    </p>
                                ) : null}
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field>
                                    <FieldLabel
                                        htmlFor="name"
                                        className={getLabelClass("name")}
                                    >
                                        Full name *
                                    </FieldLabel>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={form.name}
                                        onChange={updateField}
                                        placeholder="John Doe"
                                        className={getFieldClass("name")}
                                    />
                                    {fieldErrors.name ? (
                                        <p className="mt-1 text-sm text-destructive">
                                            {fieldErrors.name}
                                        </p>
                                    ) : null}
                                </Field>

                                <Field>
                                    <FieldLabel
                                        htmlFor="gradeLevel"
                                        className={getLabelClass("gradeLevel")}
                                    >
                                        Grade level *
                                    </FieldLabel>
                                    <Select
                                        value={form.gradeLevel || undefined}
                                        onValueChange={val => {
                                            setForm(prev => ({ ...prev, gradeLevel: val }))
                                            clearFieldError("gradeLevel")
                                            setFormError(null)
                                        }}
                                    >
                                        <SelectTrigger
                                            id="gradeLevel"
                                            className={getFieldClass("gradeLevel")}
                                        >
                                            <SelectValue placeholder="Select grade" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GRADE_LEVELS.map((grade) => (
                                                <SelectItem key={grade} value={grade}>
                                                    {grade}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldErrors.gradeLevel ? (
                                        <p className="mt-1 text-sm text-destructive">
                                            {fieldErrors.gradeLevel}
                                        </p>
                                    ) : null}
                                </Field>
                            </div>

                            <Field>
                                <FieldLabel
                                    htmlFor="email"
                                    className={getLabelClass("email")}
                                >
                                    Email *
                                </FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="johndoe@example.com"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={updateField}
                                    className={getFieldClass("email")}
                                />
                                {fieldErrors.email ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.email}
                                    </p>
                                ) : null}
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field>
                                    <FieldLabel
                                        htmlFor="phone"
                                        className={getLabelClass("phone")}
                                    >
                                        Phone number *
                                    </FieldLabel>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        placeholder="(555) 555-5555"
                                        value={form.phone}
                                        onChange={updateField}
                                        className={getFieldClass("phone")}
                                    />
                                    {fieldErrors.phone ? (
                                        <p className="mt-1 text-sm text-destructive">
                                            {fieldErrors.phone}
                                        </p>
                                    ) : null}
                                </Field>

                                <Field>
                                    <FieldLabel
                                        htmlFor="shirtSize"
                                        className={getLabelClass("shirtSize")}
                                    >
                                        Shirt size *
                                    </FieldLabel>
                                    <Select
                                        value={form.shirtSize || undefined}
                                        onValueChange={val => {
                                            setForm(prev => ({ ...prev, shirtSize: val }))
                                            clearFieldError("shirtSize")
                                            setFormError(null)
                                        }}
                                    >
                                        <SelectTrigger
                                            id="shirtSize"
                                            className={getFieldClass("shirtSize")}
                                        >
                                            <SelectValue placeholder="Select size" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SHIRT_SIZES.map((size) => (
                                                <SelectItem key={size} value={size}>
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldErrors.shirtSize ? (
                                        <p className="mt-1 text-sm text-destructive">
                                            {fieldErrors.shirtSize}
                                        </p>
                                    ) : null}
                                </Field>
                            </div>

                            <Field>
                                <FieldLabel className={getLabelClass("isReturning")}>
                                    Returning member? *
                                </FieldLabel>
                                <div
                                    className={cn(
                                        "flex flex-wrap gap-4 rounded-md border p-3",
                                        fieldErrors.isReturning && "border-destructive"
                                    )}
                                >
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="isReturning"
                                            value="yes"
                                            checked={form.isReturning === "yes"}
                                            onChange={updateField}
                                        />
                                        Yes
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="isReturning"
                                            value="no"
                                            checked={form.isReturning === "no"}
                                            onChange={updateField}
                                        />
                                        No
                                    </label>
                                </div>
                                {fieldErrors.isReturning ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.isReturning}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="whyJoin"
                                    className={getLabelClass("whyJoin")}
                                >
                                    Why do you want to join Science Olympiad? *
                                </FieldLabel>
                                <textarea
                                    id="whyJoin"
                                    name="whyJoin"
                                    value={form.whyJoin}
                                    onChange={updateField}
                                    rows={5}
                                    className={getTextareaClass("whyJoin")}
                                    placeholder="Tell us why you are interested in joining."
                                />
                                {fieldErrors.whyJoin ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.whyJoin}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="contributionIdeas"
                                    className={getLabelClass("contributionIdeas")}
                                >
                                    What new ideas do you have for the club, and how will you
                                    contribute to the club? If you were a member last year, what
                                    changes do you think could be made? *
                                </FieldLabel>
                                <textarea
                                    id="contributionIdeas"
                                    name="contributionIdeas"
                                    value={form.contributionIdeas}
                                    onChange={updateField}
                                    rows={6}
                                    className={getTextareaClass("contributionIdeas")}
                                    placeholder="Share your ideas, contributions, and any changes you would suggest."
                                />
                                {fieldErrors.contributionIdeas ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.contributionIdeas}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <Button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="w-full"
                                >
                                    Next
                                </Button>
                            </Field>
                        </>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <div>
                                    <h2 className="text-base font-semibold">
                                        Top 6 event choices *
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Add your six preferred events. Partner names are optional
                                        unless you mark them as required or recommended.
                                    </p>
                                </div>

                                {eventsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <IconLoader2 className="size-4 animate-spin" />
                                        Loading available events...
                                    </div>
                                ) : null}

                                {eventsError ? (
                                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                                        <p className="text-sm text-destructive">{eventsError}</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-3"
                                            onClick={() => void loadEvents()}
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                ) : null}

                                {fieldErrors.topEvents ? (
                                    <p className="text-sm text-destructive">
                                        {fieldErrors.topEvents}
                                    </p>
                                ) : null}

                                <div className="grid gap-3 md:grid-cols-2">
                                    {form.topEvents.map((choice, index) => (
                                        <div key={index} className="rounded-md border p-3">
                                            <div className="mb-3 flex items-center justify-between border-b pb-1">
                                                <span className="text-sm font-medium">
                                                    Choice #{index + 1}
                                                </span>
                                            </div>

                                            <div className="space-y-3">
                                                <Field>
                                                    <FieldLabel
                                                        htmlFor={`eventName-${index}`}
                                                        className={getLabelClass(
                                                            `topEvents.${index}.eventName`
                                                        )}
                                                    >
                                                        Event
                                                    </FieldLabel>

                                                    <Select
                                                        value={choice.eventName || undefined}
                                                        onValueChange={(val) => updateEventChoice(index, "eventName", val)}
                                                        disabled={eventsLoading || !!eventsError || !hasEventOptions}
                                                    >
                                                        <SelectTrigger
                                                            id={`eventName-${index}`}
                                                            className={getFieldClass(`topEvents.${index}.eventName`)}
                                                        >
                                                            <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select event"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {eventOptions.map((event) => (
                                                                <SelectItem key={event.id} value={event.name}>
                                                                    {event.name}
                                                                    {event.isTrialEvent ? " (Trial)" : ""}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {fieldErrors[`topEvents.${index}.eventName`] ? (
                                                        <p className="mt-1 text-sm text-destructive">
                                                            {fieldErrors[`topEvents.${index}.eventName`]}
                                                        </p>
                                                    ) : null}
                                                </Field>

                                                <div
                                                    className={cn(
                                                        "grid gap-3",
                                                        choice.partnerPreference === "NA"
                                                            ? "grid-cols-1"
                                                            : "sm:grid-cols-2"
                                                    )}
                                                >
                                                    {choice.partnerPreference !== "NA" ? (
                                                        <Field>
                                                            <FieldLabel
                                                                htmlFor={`partnerNames-${index}`}
                                                                className={getLabelClass(
                                                                    `topEvents.${index}.partnerNames`
                                                                )}
                                                            >
                                                                Partner(s)
                                                            </FieldLabel>
                                                            <Input
                                                                id={`partnerNames-${index}`}
                                                                value={choice.partnerNames}
                                                                onChange={(e) =>
                                                                    updateEventChoice(
                                                                        index,
                                                                        "partnerNames",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Name(s)"
                                                                className={getFieldClass(
                                                                    `topEvents.${index}.partnerNames`
                                                                )}
                                                            />
                                                            {fieldErrors[
                                                                `topEvents.${index}.partnerNames`
                                                            ] ? (
                                                                <p className="mt-1 text-sm text-destructive">
                                                                    {
                                                                        fieldErrors[
                                                                        `topEvents.${index}.partnerNames`
                                                                        ]
                                                                    }
                                                                </p>
                                                            ) : null}
                                                        </Field>
                                                    ) : null}

                                                    <Field>
                                                        <FieldLabel htmlFor={`partnerPreference-${index}`}>
                                                            Status
                                                        </FieldLabel>
                                                        <Select
                                                            value={choice.partnerPreference}
                                                            onValueChange={(val) => updateEventChoice(index, "partnerPreference", val)}
                                                        >
                                                            <SelectTrigger id={`partnerPreference-${index}`}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="NA">N/A</SelectItem>
                                                                <SelectItem value="RECOMMENDED">Recommended</SelectItem>
                                                                <SelectItem value="MANDATORY">Mandatory</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </Field>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Field>
                                <FieldLabel
                                    htmlFor="awards"
                                    className={getLabelClass("awards")}
                                >
                                    List both your Division B and Division C awards (if
                                    applicable) and mention the year, division, and whether it was
                                    attained at an invitational, regional, or state level *
                                </FieldLabel>
                                <textarea
                                    id="awards"
                                    name="awards"
                                    value={form.awards}
                                    onChange={updateField}
                                    rows={5}
                                    className={getTextareaClass("awards")}
                                    placeholder="Example: 2024 Regionals 3rd in Disease Detectives (Div B.)"
                                />
                                <FieldDescription>
                                    Write N/A if none. This will be confirmed.
                                </FieldDescription>
                                {fieldErrors.awards ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.awards}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="previousEvents"
                                    className={getLabelClass("previousEvents")}
                                >
                                    What events have you previously competed in before? *
                                </FieldLabel>
                                <textarea
                                    id="previousEvents"
                                    name="previousEvents"
                                    value={form.previousEvents}
                                    onChange={updateField}
                                    rows={4}
                                    className={getTextareaClass("previousEvents")}
                                    placeholder="List previous events"
                                />
                                <FieldDescription>Write N/A if none.</FieldDescription>
                                {fieldErrors.previousEvents ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.previousEvents}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="focusPageFile"
                                    className={getLabelClass("focusPageFile")}
                                >
                                    Attach your Broward Focus page *
                                </FieldLabel>

                                <label
                                    htmlFor="focusPageFile"
                                    className={cn(
                                        "flex cursor-pointer items-center justify-between rounded-md border border-dashed px-3 py-3 transition-colors hover:bg-muted/40",
                                        fieldErrors.focusPageFile && "border-destructive"
                                    )}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">Upload file</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {focusPageFile
                                                ? focusPageFile.name
                                                : "PDF, PNG, JPG, or JPEG"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                                        <IconUpload className="size-4" />
                                        Browse
                                    </div>
                                </label>

                                <input
                                    id="focusPageFile"
                                    name="focusPageFile"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null
                                        setFocusPageFile(file)
                                        clearFieldError("focusPageFile")
                                        setFormError(null)
                                    }}
                                />

                                <FieldDescription>
                                    Include your GPA and previous science classes. If you are
                                    unable to upload it here, email ppchsscioly@gmail.com.
                                </FieldDescription>

                                {fieldErrors.focusPageFile ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.focusPageFile}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="scienceClasses"
                                    className={getLabelClass("scienceClasses")}
                                >
                                    What science classes have you already taken or are currently
                                    taking? *
                                </FieldLabel>
                                <textarea
                                    id="scienceClasses"
                                    name="scienceClasses"
                                    value={form.scienceClasses}
                                    onChange={updateField}
                                    rows={4}
                                    className={getTextareaClass("scienceClasses")}
                                    placeholder="List your science classes"
                                />
                                {fieldErrors.scienceClasses ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.scienceClasses}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel
                                    htmlFor="mathClasses"
                                    className={getLabelClass("mathClasses")}
                                >
                                    What math classes have you already taken or are currently
                                    taking? *
                                </FieldLabel>
                                <textarea
                                    id="mathClasses"
                                    name="mathClasses"
                                    value={form.mathClasses}
                                    onChange={updateField}
                                    rows={4}
                                    className={getTextareaClass("mathClasses")}
                                    placeholder="List your math classes"
                                />
                                {fieldErrors.mathClasses ? (
                                    <p className="mt-1 text-sm text-destructive">
                                        {fieldErrors.mathClasses}
                                    </p>
                                ) : null}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="questions">Any questions?</FieldLabel>
                                <textarea
                                    id="questions"
                                    name="questions"
                                    value={form.questions}
                                    onChange={updateField}
                                    rows={4}
                                    className={getTextareaClass("questions")}
                                    placeholder="Optional"
                                />
                            </Field>

                            <div className="grid gap-3 md:grid-cols-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setFormError(null)
                                        setStep(1)
                                    }}
                                >
                                    Back
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={loading || !isReadyToSubmit}
                                >
                                    Submit{" "}
                                    {loading ? (
                                        <IconLoader2 className="size-4 animate-spin" />
                                    ) : null}
                                </Button>
                            </div>
                        </>
                    )}
                </FieldGroup>
            </form>

            <FieldDescription className="px-6 text-center">
                By submitting this application, you agree to our{" "}
                <Link href="/terms">Terms of Service</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
            </FieldDescription>
        </div>
    )
}