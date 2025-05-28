import { FormEvent, useState, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react"; // Added useQuery
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface CreateGameSessionFormProps {
  onSessionCreated: (sessionId: Id<"game_sessions">) => void;
  onCancel: () => void;
}

export function CreateGameSessionForm({ onSessionCreated, onCancel }: CreateGameSessionFormProps) {
  const createSessionMutation = useMutation(api.gameSessions.createGameSession);
  const generateUploadUrl = useAction(api.files.actionGenerateUploadUrl); // Changed to useAction
  const myProfile = useQuery(api.profiles.getMyProfile);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationHours, setDurationHours] = useState<number | undefined>(3);
  const [maxPlayers, setMaxPlayers] = useState<number | undefined>(5);
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced" | "">("");
  const [specialRules, setSpecialRules] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Check if profile is complete before creating session
    if (!myProfile || !myProfile.username || !myProfile.locationCity) {
      toast.error("Please complete your profile before creating a game session.");
      onCancel(); // Close the modal and let the app redirect to profile completion
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select a valid date and time for the session.");
      return;
    }
    if (!maxPlayers || maxPlayers <= 0) {
      toast.error("Max players must be a positive number.");
      return;
    }

    const scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
    if (scheduledTimestamp <= Date.now()) {
      toast.error("Scheduled date and time must be in the future.");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageId: Id<"_storage"> | undefined = undefined;
      if (imageFile) {
        const uploadUrl = await generateUploadUrl(); // Call useAction result
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed: ${JSON.stringify(uploadJson)}`);
        }
        imageId = uploadJson.storageId;
      }

      const sessionId = await createSessionMutation({
        title,
        description: description || undefined,
        locationCity,
        locationRegion,
        locationCountry,
        meetingPoint: meetingPoint || undefined,
        scheduledTimestamp,
        durationHours: durationHours || undefined,
        maxPlayers,
        difficultyLevel: difficultyLevel || undefined,
        specialRules: specialRules || undefined,
        imageId,
      });
      toast.success("Game session created successfully!");
      onSessionCreated(sessionId);
    } catch (error: any) {
      toast.error(`Failed to create session: ${error.message || error.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while profile is loading
  if (myProfile === undefined) {
    return (
      <div className="space-y-6 bg-white p-6 shadow-lg rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check if profile is complete before showing the form
  if (!myProfile || !myProfile.username || !myProfile.locationCity) {
    return (
      <div className="space-y-6 bg-white p-6 shadow-lg rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="text-center py-8">
          <div className="text-amber-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Required</h3>
          <p className="text-gray-600 mb-4">You need to complete your profile before creating a game session.</p>
          <button
            onClick={onCancel}
            className="btn-primary"
          >
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 bg-white p-6 shadow-lg rounded-lg max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-semibold text-primary text-center">Create New Game Session</h2>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title*</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 input-base" />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 input-base" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="locationCity" className="block text-sm font-medium text-gray-700">City*</label>
          <input id="locationCity" type="text" value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required className="mt-1 input-base" />
        </div>
        <div>
          <label htmlFor="locationRegion" className="block text-sm font-medium text-gray-700">State/Region*</label>
          <input id="locationRegion" type="text" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} required className="mt-1 input-base" />
        </div>
        <div>
          <label htmlFor="locationCountry" className="block text-sm font-medium text-gray-700">Country*</label>
          <input id="locationCountry" type="text" value={locationCountry} onChange={(e) => setLocationCountry(e.target.value)} required className="mt-1 input-base" />
        </div>
      </div>

      <div>
        <label htmlFor="meetingPoint" className="block text-sm font-medium text-gray-700">Meeting Point Details</label>
        <input id="meetingPoint" type="text" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} className="mt-1 input-base" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">Date*</label>
          <input id="scheduledDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="mt-1 input-base" />
        </div>
        <div>
          <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700">Time*</label>
          <input id="scheduledTime" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className="mt-1 input-base" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="durationHours" className="block text-sm font-medium text-gray-700">Duration (Hours)</label>
          <input id="durationHours" type="number" value={durationHours === undefined ? "" : durationHours} onChange={(e) => setDurationHours(e.target.value === "" ? undefined : parseFloat(e.target.value))} min="0.5" step="0.5" className="mt-1 input-base" />
        </div>
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700">Max Players*</label>
          <input id="maxPlayers" type="number" value={maxPlayers === undefined ? "" : maxPlayers} onChange={(e) => setMaxPlayers(e.target.value === "" ? undefined : parseInt(e.target.value))} required min="1" className="mt-1 input-base" />
        </div>
      </div>

      <div>
        <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700">Difficulty Level</label>
        <select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value as any)} className="mt-1 input-base">
          <option value="">Any</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="specialRules" className="block text-sm font-medium text-gray-700">Special Rules/Notes</label>
        <textarea id="specialRules" value={specialRules} onChange={(e) => setSpecialRules(e.target.value)} rows={2} className="mt-1 input-base" />
      </div>

      <div>
        <label htmlFor="sessionImage" className="block text-sm font-medium text-gray-700">Session Image (Optional)</label>
        <input id="sessionImage" type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="mt-1 file-input" />
        {imagePreview && (
            <div className="mt-2">
                <img src={imagePreview} alt="Session preview" className="max-h-40 rounded" />
                <button
                    type="button"
                    onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if(imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    className="text-xs text-red-500 hover:underline mt-1"
                >
                    Remove image
                </button>
            </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white py-4">
        <button type="button" onClick={onCancel} className="btn btn-outline" disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Session"}
        </button>
      </div>
    </form>
  );
}
